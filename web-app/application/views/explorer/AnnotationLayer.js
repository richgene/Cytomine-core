
/* Annotation Layer */


var AnnotationLayer = function (name, imageID, userID, color, ontologyTreeView, map) {
   console.log("new annotation layer : " + (ontologyTreeView == null || ontologyTreeView == undefined));
   var styleMap = new OpenLayers.StyleMap({
          "default" : OpenLayers.Util.applyDefaults({fillColor: color, fillOpacity: 0.5, strokeColor: "black", strokeWidth: 2},
              OpenLayers.Feature.Vector.style["default"]),
          "select" : OpenLayers.Util.applyDefaults({fillColor: "#25465D", fillOpacity: 0.5, strokeColor: "black", strokeWidth: 2},
              OpenLayers.Feature.Vector.style["default"])
       });
   this.ontologyTreeView = ontologyTreeView;
   this.name = name;
   this.imageID = imageID;
   this.userID = userID;
   this.vectorsLayer = new OpenLayers.Layer.Vector(this.name, {
          styleMap: styleMap,
          rendererOptions: {
             zIndexing: true
          }
       });
   this.features = [];
   this.controls = null;
   this.dialog = null;
   this.rotate = false;
   this.resize = false;
   this.drag = false;
   this.irregular = false;
   this.aspectRatio = false;
   this.map = map;
   this.popup = null;
   this.hoverControl = null;
   this.deleteOnSelect = false; //true if select tool checked
   this.measureOnSelect = false;
}

AnnotationLayer.prototype = {



   registerEvents: function (map) {

      var self = this;

      this.vectorsLayer.events.on({
             clickFeature : function (evt) {
                console.log("clickFeature");
             },
             onSelect : function (evt) {
                console.log("onSelect");
             },
             featureselected: function (evt) {
                console.log("featureselected: self.deleteOnSelect="+self.deleteOnSelect + " self.measureOnSelect="+self.measureOnSelect);

                if(!self.measureOnSelect) {
                   self.ontologyTreeView.refresh(evt.feature.attributes.idAnnotation);
                   console.log("self.deleteOnSelect =>" +self.deleteOnSelect );
                   if (self.deleteOnSelect == true) {
                      self.removeSelection();
                   }
                   self.showPopup(map, evt);
                }
                else self.showPopupMeasure(map, evt);

             },
             'featureunselected': function (evt) {
                console.log("featureunselected:"+self.measureOnSelect);
                if(self.measureOnSelect) self.vectorsLayer.removeFeatures(evt.feature);

                if (self.dialog != null) self.dialog.destroy();
                console.log("featureunselected");
                self.ontologyTreeView.clear();
                self.ontologyTreeView.clearAnnotation();
                self.clearPopup(map, evt);
                //alias.ontologyTreeView.refresh(null);
             },
             'featureadded': function (evt) {
                console.log("featureadded");
                /* Check if feature must throw a listener when it is added
                 * true: annotation already in database (no new insert!)
                 * false: new annotation that just have been draw (need insert)
                 * */
                if(!self.measureOnSelect){
                   if (evt.feature.attributes.listener != 'NO') {
                      console.log("self.addAnnotation(evt.feature);");
                      self.addAnnotation(evt.feature);
                   }
                }
                else {
                   self.controls.select.unselectAll();
                   self.controls.select.select(evt.feature);
                }

             },
             'beforefeaturemodified': function (evt) {
                console.log("Selected " + evt.feature.id + " for modification");
             },
             'afterfeaturemodified': function (evt) {

                self.updateAnnotation(evt.feature);

             },
             'onDelete': function (feature) {
                console.log("delete " + feature.id);
             }
          });
   },
   initControls: function (map, isOwner) {
      /*if (isOwner) { */
      this.controls = {
         'point': new OpenLayers.Control.DrawFeature(this.vectorsLayer, OpenLayers.Handler.Point),
         'line': new OpenLayers.Control.DrawFeature(this.vectorsLayer, OpenLayers.Handler.Path),
         'polygon': new OpenLayers.Control.DrawFeature(this.vectorsLayer, OpenLayers.Handler.Polygon),
         'regular': new OpenLayers.Control.DrawFeature(this.vectorsLayer, OpenLayers.Handler.RegularPolygon, {
                handlerOptions: {
                   sides: 5
                }
             }),
         'modify': new OpenLayers.Control.ModifyFeature(this.vectorsLayer),
         'select': new OpenLayers.Control.SelectFeature(this.vectorsLayer)
      }
      /* else {
       console.log("no owner");
       this.controls = {
       'select': new OpenLayers.Control.SelectFeature(this.vectorsLayer)
       }
       }*/
      map.initTools(this.controls);
   },


   /*Load annotation from database on layer */
   loadAnnotations: function (browseImageView) {
      console.log("loadAnnotations: function (map)");
      var self = this;
      new AnnotationCollection({user : this.userID, image : this.imageID, term: undefined}).fetch({
             success : function (collection, response) {
                collection.each(function(annotation) {
                   var format = new OpenLayers.Format.WKT();
                   var point = (format.read(annotation.get("location")));
                   var feature = new OpenLayers.Feature.Vector(point.geometry);
                   feature.attributes = {
                      idAnnotation: annotation.get("id"),
                      listener: 'NO',
                      importance: 10
                   };
                   self.addFeature(feature);
                });
                browseImageView.layerLoadedCallback(self);
             }
          });
      browseImageView.addVectorLayer(this.vectorsLayer, this.userID);
   },
   addFeature: function (feature) {
      console.log("addFeature: function (feature)");
      console.log("feature.attributes.idAnnotation="+feature.attributes.idAnnotation);
      this.features[feature.attributes.idAnnotation] = feature;
      console.log("this.vectorsLayer.addFeatures(feature)");
      this.vectorsLayer.addFeatures(feature);
   },
   selectFeature: function (feature) {
      this.controls.select.unselectAll();
      this.controls.select.select(feature);
   },
   removeFeature: function (idAnnotation) {
      var feature = this.features[idAnnotation];
      if (feature != null && feature.popup) {
         this.map.removePopup(feature.popup);
         feature.popup.destroy();
         feature.popup = null;
         this.popup = null;
      }
      this.vectorsLayer.removeFeatures(feature);
      this.ontologyTreeView.clearAnnotation();
      this.ontologyTreeView.clear();
      this.features[idAnnotation] = null;

   },
   getFeature : function(idAnnotation) {
      return this.features[idAnnotation];
   },
   removeSelection: function () {
      for (var i in this.vectorsLayer.selectedFeatures) {
         var feature = this.vectorsLayer.selectedFeatures[i];
         console.log(feature);
         this.removeAnnotation(feature);
      }
   },
   clearPopup : function (map, evt) {
      var self = this;
      feature = evt.feature;
      if (feature.popup) {
         self.popup.feature = null;
         map.removePopup(feature.popup);
         feature.popup.destroy();
         feature.popup = null;
         self.popup = null;
      }
   },
   showPopup : function(map, evt) {
      var self = this;
      require([
         "text!application/templates/explorer/PopupAnnotation.tpl.html"
      ], function(tpl) {
         //console.log(e.type, e.feature.id, e.feature.attributes.idAnnotation);
         if(evt.feature.popup != null){
            return;
         }
         new AnnotationModel({id : evt.feature.attributes.idAnnotation}).fetch({
                success : function (model, response) {
                   var content = _.template(tpl, model.toJSON());
                   self.popup = new OpenLayers.Popup("",
                       new OpenLayers.LonLat(evt.feature.geometry.getBounds().right + 50, evt.feature.geometry.getBounds().bottom + 50),
                       new OpenLayers.Size(200,60),
                       content,
                       false);
                   self.popup.setBackgroundColor("transparent");
                   self.popup.setBorder(0);
                   self.popup.padding = 0;

                   evt.feature.popup = self.popup;
                   self.popup.feature = evt.feature;
                   map.addPopup(self.popup);
                }
             });
      });

   },
   showPopupMeasure : function(map, evt) {
      var self = this;
      require([
         "text!application/templates/explorer/PopupMeasure.tpl.html"
      ], function(tpl) {
         if(evt.feature.popup != null){
            return;
         }
         var content = _.template(tpl, {length:evt.feature.geometry.getLength()});
         self.popup = new OpenLayers.Popup("chicken",
             new OpenLayers.LonLat(evt.feature.geometry.getBounds().right + 50, evt.feature.geometry.getBounds().bottom + 50),
             new OpenLayers.Size(200,60),
             content,
             false);
         self.popup.setBackgroundColor("transparent");
         self.popup.setBorder(0);
         self.popup.padding = 0;

         evt.feature.popup = self.popup;
         self.popup.feature = evt.feature;
         map.addPopup(self.popup);
      });


   },
   enableHightlight : function () {
      //this.hoverControl.activate();
   },
   disableHightlight : function () {
      //this.hoverControl.deactivate();
   },
   initHightlight : function (map) { //buggy :(
      /*this.hoverControl = new OpenLayers.Control.SelectFeature(this.vectorsLayer, {
       hover: true,
       highlightOnly: true,
       renderIntent: "temporary",
       eventListeners: {

       featurehighlighted: this.showPopup,
       featureunhighlighted: this.clearpopup
       }
       });


       map.addControl(this.hoverControl);
       //this.hoverControl.activate();   */
   },

   /*Add annotation in database*/
   addAnnotation: function (feature) {
      console.log("addAnnotation");
      var newFeature = null;
      var format = new OpenLayers.Format.WKT();
      var geomwkt = format.write(feature);
      var alias = this;
      var annotation = new AnnotationModel({
             //"class": "be.cytomine.project.Annotation",
             name: "",
             location: geomwkt,
             image: this.imageID,
             parse: function(response) {
                console.log("response : " + response);
                window.app.view.message("Annotation", response.message, "");
                return response.annotation;
             }});

      console.log("annotation model");
      new BeginTransactionModel({}).save({}, {
             success: function (model, response) {
                console.log(response.message);
                annotation.save(annotation.toJSON(), {
                       success: function (model, response) {
                          console.log(response.message);
                          // window.app.view.message(response.message);

                          model.set({id : response.annotation.id});
                          console.log("new annotation id" + response.annotation.id);

                          var point = (format.read(response.annotation.location));
                          var geom = point.geometry;
                          newFeature = new OpenLayers.Feature.Vector(geom);
                          newFeature.attributes = {
                             idAnnotation: response.annotation.id,
                             listener: 'NO',
                             importance: 10
                          };

                          var terms = alias.ontologyTreeView.getTermsChecked();
                          var counter = 0;
                          if (terms.length == 0) {
                             alias.addTermCallback(0,0,feature, newFeature,response);
                          }

                          _.each(terms, function (id) {
                             new AnnotationTermModel({
                                    term: id,
                                    annotation: response.annotation.id
                                 }).save(null, {success : function (model, response) {
                                    alias.addTermCallback(terms.length, ++counter, feature, newFeature,response);
                                 }});
                          });

                       },
                       error: function (model, response) {
                          var json = $.parseJSON(response.responseText);
                          window.app.view.message("Add annotation", "error:"+json.errors, "");
                       }
                    });

             },
             error: function (model, response) {
                console.log("ERRORR: error transaction begin");
             }
          });

   },
   addTermCallback : function(total, counter, oldFeature, newFeature,response) {
      if (counter < total) return;
      this.addFeature(newFeature);
      this.controls.select.unselectAll();
      this.controls.select.select(newFeature);
      this.vectorsLayer.removeFeatures([oldFeature]);
      console.log(response);
      window.app.view.message("Add annotation", response.message, "");
      new EndTransactionModel({}).save();
   },
   removeTermCallback : function(total, counter, feature,idAnnotation) {
      console.log("counter " + counter + " vs " + total);
      if (counter < total) return;
      this.removeFeature(feature);
      this.controls.select.unselectAll();
      this.vectorsLayer.removeFeatures([feature]);

      new AnnotationModel({id:feature.attributes.idAnnotation}).destroy({success: function(){
             console.log("Delete annotation");
             console.log("End transaction");
             new EndTransactionModel({}).save();
          }});



   },
   removeAnnotation : function(feature) {
      var alias = this;
      var idAnnotation = feature.attributes.idAnnotation;
      console.log("Delete annotation id ="+idAnnotation);
      var annotation = new AnnotationModel({id:idAnnotation});
      var counter = 0;
      new BeginTransactionModel({}).save({}, {
             success: function (model, response) {

                new AnnotationTermCollection({idAnnotation:idAnnotation}).fetch({success:function (collection, response){
                       if (collection.size() == 0) {
                          alias.removeTermCallback(0,0, feature, idAnnotation);
                          return;
                       }
                       collection.each(function(term) {
                          console.log("delete term="+term.id + " from annotation " + idAnnotation);
                          console.log("annotationTerm="+JSON.stringify(term));

                          new AnnotationTermModel({annotation:idAnnotation,term:term.id}).destroy({success : function (model, response) {
                                 alias.removeTermCallback(collection.length, ++counter, feature, idAnnotation);
                              }});

                       });

                    }});

             },
             error: function (model, response) {
                console.log("ERRORR: error transaction begin");
             }
          });

   },

   /*Modifiy annotation on database*/
   updateAnnotation: function (feature) {
      var format = new OpenLayers.Format.WKT();
      var geomwkt = format.write(feature);
      new AnnotationModel({id:feature.attributes.idAnnotation}).fetch({
             success : function(model, response) {
                model.set({location : geomwkt});
                model.save();  //TODO : callback success-error
             }
          });
   },
   /** Triggered when add new feature **/
   /*onFeatureAdded : function (evt) {
    console.log("onFeatureAdded start:"+evt.feature.attributes.idAnnotation);
    // Check if feature must throw a listener when it is added
    // true: annotation already in database (no new insert!)
    // false: new annotation that just have been draw (need insert)
    //
    if(evt.feature.attributes.listener!='NO')
    {
    console.log("add " + evt.feature);
    alias.addAnnotation(evt.feature);
    }
    },*/

   /** Triggered when update feature **/
   /* onFeatureUpdate : function (evt) {
    console.log("onFeatureUpdate start");

    this.updateAnnotation(evt.feature);
    },*/
   toggleRotate: function () {
      this.resize = false;
      this.drag = false;
      this.rotate = true;
      this.updateControls();
      this.toggleControl("modify");
   },
   toggleResize: function () {
      this.resize = true;
      this.drag = false;
      this.rotate = false;
      this.updateControls();
      this.toggleControl("modify");
   },
   toggleDrag: function () {
      this.resize = false;
      this.drag = true;
      this.rotate = false;
      this.updateControls();
      this.toggleControl("modify");

   },
   toggleEdit: function () {
      this.resize = false;
      this.drag = false;
      this.rotate = false;
      this.updateControls();
      this.toggleControl("modify");

   },
   toggleIrregular: function () {
      console.log("toggleIrregular");
      this.irregular = !this.irregular;
      this.updateControls();
   },
   toggleAspectRatio: function () {
      this.aspectRatio = !this.aspectRatio;
      this.updateControls();
   },
   setSides: function (sides) {
      this.sides = sides;
      this.updateControls();
   },
   updateControls: function () {

      this.controls.modify.mode = OpenLayers.Control.ModifyFeature.RESHAPE;
      if (this.rotate) {
         this.controls.modify.mode |= OpenLayers.Control.ModifyFeature.ROTATE;
      }

      if (this.resize) {
         this.controls.modify.mode |= OpenLayers.Control.ModifyFeature.RESIZE;
         if (this.aspectRatio) {
            this.controls.modify.mode &= ~OpenLayers.Control.ModifyFeature.RESHAPE;
         }
      }
      if (this.drag) {
         this.controls.modify.mode |= OpenLayers.Control.ModifyFeature.DRAG;
      }
      if (this.rotate || this.drag) {
         this.controls.modify.mode &= ~OpenLayers.Control.ModifyFeature.RESHAPE;
      }
      this.controls.regular.handler.sides = this.sides;
      this.controls.regular.handler.irregular = this.irregular;
   },
   toggleControl: function (name) {
      //Simulate an OpenLayers.Control.EraseFeature tool by using SelectFeature with the flag 'deleteOnSelect'
      this.deleteOnSelect = false;
      this.measureOnSelect = false;
      for (key in this.controls) {
         var control = this.controls[key];
         if (name == key) {
            control.activate();
            console.log("activate " + name);
            if (control == this.controls.modify)  {
               for (var i in this.vectorsLayer.selectedFeatures) {
                  var feature = this.vectorsLayer.selectedFeatures[i];
                  control.selectFeature(feature);
               }
            }
         } else {
            control.deactivate();
            if (control == this.controls.modify)  {
               for (var i in this.vectorsLayer.selectedFeatures) {
                  var feature = this.vectorsLayer.selectedFeatures[i];
                  control.unselectFeature(feature);
               }

            }
         }
      }

   },
   /* Callbacks undo/redo */
   annotationAdded: function (idAnnotation) {
      var self = this;
      var deleteOnSelectBackup = self.deleteOnSelect;
      self.deleteOnSelect = false;

      var annotation = new AnnotationModel({
             id: idAnnotation
          }).fetch({
             success: function (model) {
                var format = new OpenLayers.Format.WKT();
                var location = format.read(model.get('location'));
                var feature = new OpenLayers.Feature.Vector(location.geometry);
                feature.attributes = {
                   idAnnotation: model.get('id'),
                   listener: 'NO',
                   importance: 10
                };
                self.addFeature(feature);
                self.selectFeature(feature);
                self.controls.select.activate();
                self.deleteOnSelect = deleteOnSelectBackup;
             }
          });

   },
   annotationRemoved: function (idAnnotation) {
      this.removeFeature(idAnnotation);
   },
   annotationUpdated: function (idAnnotation, idImage) {
      this.annotationRemoved(idAnnotation);
      this.annotationAdded(idAnnotation);
   },
   termAdded: function (idAnnotation, idTerm) {
      var self = this;
      console.log("termAdded");
      this.ontologyTreeView.check(idTerm);
   },
   termRemoved: function (idAnnotation, idTerm) {
      console.log("termRemoved");
      this.ontologyTreeView.uncheck(idTerm);
   }
}