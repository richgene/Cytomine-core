package be.cytomine.image

import be.cytomine.AnnotationDomain
import be.cytomine.Exception.ObjectNotFoundException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.ontology.Term
import com.vividsolutions.jts.geom.Geometry
import ij.ImagePlus
import org.apache.http.Header
import org.apache.http.HttpEntity
import org.apache.http.HttpHost
import org.apache.http.HttpResponse
import org.apache.http.auth.AuthScope
import org.apache.http.auth.UsernamePasswordCredentials
import org.apache.http.client.AuthCache
import org.apache.http.client.methods.HttpGet
import org.apache.http.client.protocol.ClientContext
import org.apache.http.impl.auth.BasicScheme
import org.apache.http.impl.client.BasicAuthCache
import org.apache.http.impl.client.DefaultHttpClient
import org.apache.http.protocol.BasicHttpContext

import javax.imageio.ImageIO
import java.awt.Color
import java.awt.Graphics2D
import java.awt.RenderingHints
import java.awt.Toolkit
import java.awt.image.BufferedImage


/**
 *  TODOSTEVBEN:: doc + clean
 */
class ImageProcessingService {


    def segmentationService
    def grailsApplication

    static final int MIN_REQUESTED_CROP_SIZE = 8

    static transactional = false

    public def isInROI(ImagePlus ip, x, y) {
        return (x >= 0 && x < ip.getWidth() && y >= 0 && y < ip.getHeight())
    }


    /**
     * Get annotation crop from this image
     */
    String cropURL(AnnotationDomain annotation) {
        return annotation.toCropURL()
    }

    BufferedImage crop(AnnotationDomain annotation, params) {
        String cropURL = annotation.toCropURL(params)
        println cropURL
        return getImageFromURL(cropURL)
    }






    /**
     * Read a picture from url
     * @param url Picture url
     * @return Picture as an object
     */
//    public BufferedImage getImageFromURL(String url) {
//        BufferedImage bufferedImage = ImageIO.read(new URL(url))
//        return bufferedImage
//    }

    public BufferedImage getImageFromURL(String url) throws MalformedURLException, IOException, Exception {
        log.debug("readBufferedImageFromURL:"+url);
        URL URL = new URL(url);
        HttpHost targetHost = new HttpHost(URL.getHost(), URL.getPort());
        log.debug("targetHost:"+targetHost);
        DefaultHttpClient client = new DefaultHttpClient();
        log.debug("client:"+client);
        // Add AuthCache to the execution context
        BasicHttpContext localcontext = new BasicHttpContext();
        log.debug("localcontext:"+localcontext);
        BufferedImage img = null;
        HttpGet httpGet = new HttpGet(URL.toString());
        HttpResponse response = client.execute(targetHost, httpGet, localcontext);
        int code = response.getStatusLine().getStatusCode();
        System.out.println("url="+url + " is " + code + "(OK="+HttpURLConnection.HTTP_OK +",MOVED="+HttpURLConnection.HTTP_MOVED_TEMP+")");

        boolean isOK = (code == HttpURLConnection.HTTP_OK);
        boolean isFound = (code == HttpURLConnection.HTTP_MOVED_TEMP);
        boolean isErrorServer = (code == HttpURLConnection.HTTP_INTERNAL_ERROR);

        if(!isOK && !isFound & !isErrorServer) {
            throw new IOException(url + " cannot be read: "+code);
        }
        HttpEntity entity = response.getEntity();
        if (entity != null) {
            img = ImageIO.read(entity.getContent());
        }
        return img;


    }




    /*public BufferedImage applyMaskToAlpha(BufferedImage image, BufferedImage mask) {
        //TODO:: document this method
        int width = image.getWidth()
        int height = image.getHeight()
        int[] imagePixels = image.getRGB(0, 0, width, height, null, 0, width)
        int[] maskPixels = mask.getRGB(0, 0, width, height, null, 0, width)
        int black_rgb = Color.BLACK.getRGB()
        for (int i = 0; i < imagePixels.length; i++)
        {
            int color = imagePixels[i] & 0x00FFFFFF; // mask away any alpha present
            int alphaValue = (maskPixels[i] == black_rgb) ? 0x00 : 0xFF
            int maskColor = alphaValue << 24 // shift value into alpha bits
            imagePixels[i] = color | maskColor
        }
        BufferedImage combined = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB)
        combined.setRGB(0, 0, width, height, imagePixels, 0, width)
        return combined
    }  */

    /*public BufferedImage getMaskImage(AnnotationDomain annotation, params, Boolean withAlpha) {
        //TODO:: document this method

        BufferedImage crop = crop(annotation, params)
        BufferedImage mask = new BufferedImage(crop.getWidth(),crop.getHeight(),BufferedImage.TYPE_INT_ARGB);
        AbstractImage abstractImage = annotation.getImage().getBaseImage()

        Geometry geometry = annotation.getLocation()

        def boundaries = annotation.getBoundaries()
        double x_ratio = crop.getWidth() / boundaries.width
        double y_ratio = crop.getHeight() / boundaries.height

        mask = segmentationService.colorizeWindow(abstractImage, mask, [geometry], boundaries.topLeftX, abstractImage.getHeight() - boundaries.topLeftY, x_ratio, y_ratio)

        if (withAlpha)
            return applyMaskToAlpha(crop, mask)
        else
            return mask
    } */



    /*public BufferedImage alphamask(AnnotationDomain annotation, def params) {
        //TODO:: document this method
        if (!annotation) {
            throw new ObjectNotFoundException("Annotation $params.annotation does not exist!")
        }
        Term term = Term.read(params.term)
        if (!term) {
            throw new ObjectNotFoundException("Term $params.term does not exist!")
        }
        if (!annotation.termsId().contains(term.id)) {
            throw new WrongArgumentException("Term $term.id not associated with annotation $annotation.id")
        }
        Integer zoom = null
        if (params.zoom != null) zoom = Integer.parseInt(params.zoom)

        def zoomMinMax = annotation.getImage().getBaseImage().getZoomLevels()
        if ((params.zoom != null) && (zoom > zoomMinMax.max)) {
            zoom = zoomMinMax.max
        } else if ((params.zoom != null) && (zoom < zoomMinMax.min)) {
            zoom = zoomMinMax.min
        }
        try {
            return getMaskImage(annotation, term, zoom, true)
        } catch (Exception e) {
            log.error("GetThumb:" + e);
        }
        return null;
    }*/

    /*public BufferedImage createCropWithDraw(AnnotationDomain annotation,String baseImage) {
        return createCropWithDraw(annotation,getImageFromURL(baseImage))
    }

    public BufferedImage createCropWithDraw(AnnotationDomain annotation,BufferedImage baseImage) {
        //AbstractImage image, BufferedImage window, LineString lineString, Color color, int x, int y, double x_ratio, double y_ratio
        def boundaries = annotation.getBoundaries()
        double x_ratio = baseImage.getWidth() / boundaries.width
        double y_ratio = baseImage.getHeight() / boundaries.height
        //int borderWidth = ((double)annotation.getArea()/(100000000d/50d))
        int borderWidth = ((double)boundaries.width/(15000/250d))*x_ratio

        //AbstractImage image, BufferedImage window, Collection<Geometry> geometryCollection, Color c, int borderWidth,int x, int y, double x_ratio, double y_ratio
        baseImage = segmentationService.drawPolygon(
                annotation.image.baseImage,
                baseImage,
                [annotation.location],
                Color.BLACK,
                borderWidth,
                boundaries.topLeftX,
                annotation.image.baseImage.getHeight() - boundaries.topLeftY,
                x_ratio,
                y_ratio
        )
        baseImage
    }



    public BufferedImage scaleImage(BufferedImage img, Integer width, Integer height) {
        int imgWidth = img.getWidth();
        int imgHeight = img.getHeight();
        if (imgWidth*height < imgHeight*width) {
            width = imgWidth*height/imgHeight;
        } else {
            height = imgHeight*width/imgWidth;
        }
        BufferedImage newImage = new BufferedImage(width, height,
                BufferedImage.TYPE_INT_RGB);
        Graphics2D g = newImage.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.clearRect(0, 0, width, height);
            g.drawImage(img, 0, 0, width, height, null);
        } finally {
            g.dispose();
        }
        return newImage;
    } */


    /**
     * Get crop annotation URL
     * @param annotation Annotation
     * @param params Params
     * @return Crop Annotation URL
     */
    public def getCropAnnotationURL(AnnotationDomain annotation, def params) {
        if (annotation == null) {
            throw new ObjectNotFoundException("Annotation $params.annotation does not exist!")
        } else  {
            try {
                String cropURL = cropURL(annotation)
                if (cropURL == null) {
                    //no crop available, add lambda image
                    cropURL = grailsApplication.config.grails.serverURL + "/images/cytomine.jpg"
                }
                return cropURL
            } catch (Exception e) {
                log.error("GetCrop:" + e)
                return null
            }
        }
    }
}
