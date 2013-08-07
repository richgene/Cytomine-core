package be.cytomine

import be.cytomine.Exception.ObjectNotFoundException
import be.cytomine.Exception.WrongArgumentException
import be.cytomine.image.ImageInstance
import be.cytomine.ontology.AlgoAnnotation
import be.cytomine.ontology.AnnotationIndex
import be.cytomine.ontology.ReviewedAnnotation
import be.cytomine.ontology.Term
import be.cytomine.ontology.UserAnnotation
import be.cytomine.project.Project
import be.cytomine.utils.GisUtils
import com.vividsolutions.jts.geom.Coordinate
import com.vividsolutions.jts.geom.Envelope
import com.vividsolutions.jts.geom.Geometry
import com.vividsolutions.jts.io.WKTReader

/**
 * User: lrollus
 * Date: 18/10/12
 * GIGA-ULg
 *
 * Annotation generic domain
 * Annotation can be:
 * -UserAnnotation => created by human user
 * -AlgoAnnotation => created by job
 * -ReviewedAnnotation => User or AlgoAnnotation validate by user
 */
abstract class AnnotationDomain extends CytomineDomain implements Serializable {

    /**
     * Annotation geometry object
     */
    Geometry location

    /**
     * Annotation image
     */
    ImageInstance image

    /**
     * Annotation project
     * Redundant with image.project, speedup
     */
    Project project

    /**
     * Compression threshold used for annotation simplification
     */
    Double geometryCompression

    /**
     * Number of comments for annotation
     * Redundant to speed up
     */
    long countComments = 0L

    /**
     * Annotation geometry WKT location
     * Redundant, better to use this than getting WKT from location properties
     */
    String wktLocation  //speedup listing

    /* Transients values for JSON/XML rendering */
    //TODO:: remove from here, use custom SQL request with these info
    Double similarity
    Double rate
    Long idTerm
    Long idExpectedTerm

    Double area
    Double perimeter
    Integer areaUnit
    Integer perimeterUnit


    static belongsTo = [ImageInstance, Project]

    static transients = ["boundaries", "similarity","rate", "idTerm", "idExpectedTerm"]

    static constraints = {
        location(nullable: false)
        geometryCompression(nullable: true)
        project(nullable:true)
        wktLocation(nullable:false, empty:false)
        area(nullable:true)
        perimeter(nullable:true)
        areaUnit(nullable:true)
        perimeterUnit(nullable:true)
    }

    static mapping = {
        wktLocation(type: 'text')
        tablePerHierarchy false
        id generator: "assigned"
        columns {
            location type: org.hibernatespatial.GeometryUserType
        }
    }

    /**
     * If name is empty, fill it by "Annotation $id"
     */
    public beforeInsert() {
        super.beforeInsert()
        if(!project) {
            project = image.project
        }
        this.makeValid()
        wktLocation = location.toText()
    }

    def beforeUpdate() {
        super.beforeUpdate()
        this.makeValid()
        this.computeGIS()
        wktLocation = location.toText()
    }

    def beforeValidate() {
        if (!created) {
            created = new Date()
        }
        if (id == null) {
            id = sequenceService.generateID()
        }
        this.computeGIS()
        if(!wktLocation)
            wktLocation = location.toText()
    }

    /**
     * Get all terms map with the annotation
     * @return Terms list
     */
    abstract def terms()

    /**
     * Get all annotation terms id
     * @return Terms id list
     */
    abstract def termsId()

    /**
     * Check if its an algo annotation
     */
    abstract boolean isAlgoAnnotation()

    /**
     * Check if its a review annotation
     */
    abstract boolean isReviewedAnnotation()

    /**
     * Get all terms for automatic review
     * If review is done "for all" (without manual user control), we add these term to the new review annotation
     * @return
     */
    abstract List<Term> termsForReview()

    /**
     * Get CROP (annotation image area) URL for this annotation
     * @param cytomineUrl Cytomine base URL
     * @return Full CROP Url
     */
    abstract def getCropUrl(String cytomineUrl)

    String toString() {return "Annotation " + id}

    def getFilename() {
          return this.image?.baseImage?.getFilename()
      }

    def retrieveAreaUnit() {
        GisUtils.retrieveUnit(areaUnit)
    }

    def retrievePerimeterUnit() {
        GisUtils.retrieveUnit(perimeterUnit)
    }

    /**
     * Get the container domain for this domain (usefull for security)
     * @return Container of this domain
     */
    public CytomineDomain container() {
        return project;
    }

    def computeGIS() {
        def image = this.image.baseImage

        //compute unit
        if (image.resolution == null) {
            perimeterUnit = GisUtils.PIXELv
            areaUnit = GisUtils.PIXELS2v
        } else {
            perimeterUnit = GisUtils.MMv
            areaUnit = GisUtils.MICRON2v
        }

        if (image.resolution == null) {
            area = Math.round(this.location.getArea())
            perimeter = Math.round(this.location.getLength())
        } else {
            area = Math.round(this.location.getArea() * image.resolution * image.resolution)
            perimeter = Math.round(this.location.getLength() * image.resolution / 1000)
        }

    }


    def getCentroid() {
        if (location.area < 1) return null
        def centroid = location.getCentroid()
        def response = [:]
        response.x = centroid.x
        response.y = centroid.y
        return response
    }

   def getBoundaries() {
       //get num points
       if (location.getNumPoints()>3) {
         Envelope env = location.getEnvelopeInternal();
         Integer maxY = env.getMaxY();
         Integer minX = env.getMinX();
         Integer width = env.getWidth();
         Integer height = env.getHeight();
         return [topLeftX: minX, topLeftY: maxY, width: width, height: height]
       } else throw new be.cytomine.Exception.InvalidRequestException("Cannot make a crop for a POINT")

    }

    def toCropURL() {
        def boundaries = getBoundaries()
        return image.baseImage.getCropURL(boundaries.topLeftX, boundaries.topLeftY, boundaries.width, boundaries.height)
    }

    def toCropURLWithMaxSize(int maxSize) {
        def boundaries = getBoundaries()
        return image.baseImage.getCropURLWithMaxWithOrHeight(boundaries.topLeftX, boundaries.topLeftY, boundaries.width, boundaries.height, maxSize, maxSize)
    }

    def toCropURL(int zoom) {
        def boundaries = getBoundaries()
        return image.baseImage.getCropURL(boundaries.topLeftX, boundaries.topLeftY, boundaries.width, boundaries.height, zoom)
    }

    def getCallBack() {
        return [annotationID: this.id, imageID: this.image.id]

    }


    /**
     * Get user/algo/reviewed annotation with id
     * Check the correct type and return it
     * @param id Annotation id
     * @return Annotation
     */
    public static AnnotationDomain getAnnotationDomain(String id) {
        try {
            getAnnotationDomain(Long.parseLong(id))
        } catch(NumberFormatException e) {
            throw new ObjectNotFoundException("Annotation ${id} not found")
        }
    }

    /**
     * Get user/algo/reviewed annotation with id
     * Check the correct type and return it
     * @param id Annotation id
     * @return Annotation
     */
    public static AnnotationDomain getAnnotationDomain(long id) {
        AnnotationDomain basedAnnotation = UserAnnotation.read(id)
        if (!basedAnnotation)
            basedAnnotation = AlgoAnnotation.read(id)
        if (!basedAnnotation)
            basedAnnotation = ReviewedAnnotation.read(id)
        if (basedAnnotation) return basedAnnotation
        else throw new ObjectNotFoundException("Annotation ${id} not found")

    }


    public void makeValid() {
        Geometry geom = new WKTReader().read(this.location.toText())
        Geometry validGeom
        String type = geom.getGeometryType().toUpperCase()

//        println "*******************************"
//        println "type=" + type
//        println "valid=" + geom.isValid()
//        println "*******************************"
        println "1=$geom"
        if (!geom.isValid()) {
            println "Geometry is not valid"
            //selfintersect,...
            validGeom = geom.buffer(0)
            this.location = validGeom
            this.wktLocation = validGeom.toText()
            geom = new WKTReader().read(this.location.toText())
            type = geom.getGeometryType().toUpperCase()
        }
        println "2=$geom"
        if (geom.isEmpty()) {
            println "Geometry is empty"
            //empty polygon,...
            throw new WrongArgumentException("${geom.toText()} is an empty geometry!")
        }

        //for geometrycollection, we may take first collection element
        if (type.equals("LINESTRING") || type.equals("MULTILINESTRING") || type.equals("GEOMETRYCOLLECTION")) {
            //geometry collection, take first elem
            throw new WrongArgumentException("${geom.getGeometryType()} is not a valid geometry type!")
        }


    }


}
