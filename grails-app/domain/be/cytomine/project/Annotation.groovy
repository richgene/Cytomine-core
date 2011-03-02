package be.cytomine.project

import grails.converters.*
import com.vividsolutions.jts.geom.Geometry
import com.vividsolutions.jts.geom.Coordinate
import com.vividsolutions.jts.io.WKTReader
import be.cytomine.security.User
import be.cytomine.SequenceDomain
import be.cytomine.rest.UrlApi

class Annotation extends SequenceDomain implements Serializable {

  String name
  Geometry location
  Image image
  Double zoomLevel
  String channels
  User user

  static belongsTo = [image:Image]
  static hasMany = [ annotationTerm: AnnotationTerm ]

  static transients = ["cropURL", "boundaries"]

  static constraints = {
    name(blank:true)
    location(nullable:false)
    zoomLevel(nullable:true)
    channels(nullable:true)
    user(nullable:false)
  }

  static mapping = {
    id generator : "assigned"
    columns {
      location type: org.hibernatespatial.GeometryUserType
    }
  }

  /**
   * If name is empty, fill it by "Annotation $id"
   */
  public beforeInsert() {
    super.beforeInsert()
    name = name && !name.trim().equals("")? name : "Annotation " + id
  }

  /**
   * Get all terms map with the annotation
   * @return list of terms
   */
  def terms() {
    return annotationTerm.collect{
      it.term
    }
  }

  private def getBoundaries () {
    def metadata = JSON.parse(new URL(image.getMetadataURL()).text)
    Coordinate[] coordinates = location.getEnvelope().getCoordinates()
    int topLeftX = coordinates[3].x
    int topLeftY = Integer.parseInt(metadata.height) - coordinates[3].y
    int width =  coordinates[1].x - coordinates[0].x
    int height =  coordinates[3].y - coordinates[0].y
    int zoom = Integer.parseInt(metadata.levels)
    log.debug "topLeftX :"+ topLeftX + " topLeftY :" + topLeftY + " width :" +  width + " height :" + height + " zoom :" + zoom
    return [topLeftX : topLeftX, topLeftY : topLeftY,width : width, height : height, zoom : zoom]
  }

  def getCropURL(int zoom) {
    def boundaries = getBoundaries()
    return image.getCropURL(boundaries.topLeftX, boundaries.topLeftY, boundaries.width, boundaries.height, zoom)
  }

  /**
   * Create a new Annotation with jsonAnnotation attributes
   * So, jsonAnnotation must have jsonAnnotation.location, jsonAnnotation.name, ...
   * @param jsonAnnotation JSON
   * @return Annotation
   */
  static Annotation createAnnotationFromData(jsonAnnotation) {
    def annotation = new Annotation()
    getAnnotationFromData(annotation,jsonAnnotation)
  }

  /**
   * Fill annotation with data attributes
   * So, jsonAnnotation must have jsonAnnotation.location, jsonAnnotation.name, ...
   * @param annotation Annotation Source
   * @param jsonAnnotation JSON
   * @return annotation with json attributes
   */
  static Annotation getAnnotationFromData(annotation,jsonAnnotation) {
    annotation.name = jsonAnnotation.name
    annotation.location = new WKTReader().read(jsonAnnotation.location);
    annotation.image = Image.get(jsonAnnotation.image);
    annotation.zoomLevel = (!jsonAnnotation.zoomLevel.toString().equals("null"))  ? ((String)jsonAnnotation.zoomLevel).toDouble() : -1
    annotation.channels =  jsonAnnotation.channels
    annotation.user =  User.get(jsonAnnotation.user);

    annotation.created = (!jsonAnnotation.created.toString().equals("null"))  ? new Date(Long.parseLong(jsonAnnotation.created)) : null
    annotation.updated = (!jsonAnnotation.updated.toString().equals("null"))  ? new Date(Long.parseLong(jsonAnnotation.updated)) : null

    return annotation;
  }



  static void registerMarshaller() {
    println "Register custom JSON renderer for " + Annotation.class
    JSON.registerObjectMarshaller(Annotation) {
      def returnArray = [:]
      returnArray['class'] = it.class
      returnArray['id'] = it.id
      returnArray['name'] = it.name
      returnArray['location'] = it.location.toString()
      returnArray['image'] = it.image? it.image.id : null
      returnArray['zoomLevel'] = it.zoomLevel
      returnArray['channels'] = it.channels
      returnArray['user'] = it.user? it.user.id : null
      returnArray['created'] = it.created? it.created.time.toString() : null
      returnArray['updated'] = it.updated? it.updated.time.toString() : null

      returnArray['term'] = UrlApi.getTermsURLWithAnnotationId(it.id)
      return returnArray
    }
  }

}
