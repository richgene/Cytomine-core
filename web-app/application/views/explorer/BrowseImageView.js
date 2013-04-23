var BrowseImageView = Backbone.View.extend({
    tagName: "div",
    tileSize: 256,
    review: false,
    divPrefixId: "",
    divId: "",
    currentAnnotation: null,
    userJobForImage: null,
    /**
     * BrowseImageView constructor
     * Accept options used for initialization
     * @param options
     */
    initialize: function (options) {
        console.log("initialize");
        console.log(options);
        this.iPad = ( navigator.userAgent.match(/iPad/i) != null );
        this.initCallback = options.initCallback;
        this.layers = [];
        this.layersLoaded = 0;
        this.baseLayers = [];
        this.broadcastPositionInterval = null;
        this.watchOnlineUsersInterval = null;
        this.annotationsPanel = null;
        this.ontologyPanel = null;
        this.reviewPanel = null;
        this.annotationProperties = null;
        this.map = null;
        //this.nbDigitialZoom = Math.round(Math.log(80 / this.model.get('magnification')) / Math.log(2));//max zoom desired is 80X
        this.nbDigitialZoom = 0; //TMP DISABLED DUE TO OPENLAYERS BUG. http://dev.cytomine.be/jira/browse/CYTO-613
        this.digitalResolutions = [];
        for (var i = 0; i < this.nbDigitialZoom; i++) {
            this.digitalResolutions.push(1 / Math.pow(2, i + 1));
        }
        this.currentAnnotation = null;
        if (options.review != undefined) {
            this.review = options.review;
        }
        if (!this.review) {
            this.divPrefixId = "tabs-image";
        }
        else {
            this.divPrefixId = "tabs-review";
        }

        _.bindAll(this, "initVectorLayers");
    },

    /**
     * Render the html into the DOM element associated to the view
     * @param tpl
     */
    doLayout: function (tpl) {
        var self = this;
        console.log("BrowseImageView:doLayout");

        if (!this.review) {
            this.divId = "tabs-image-" + window.app.status.currentProject + "-" + this.model.id + "-";
        }
        else {
            this.divId = "tabs-review-" + window.app.status.currentProject + "-" + this.model.id + "-";
        }

        var templateData = this.model.toJSON();

        templateData.project = window.app.status.currentProject;
        templateData.type = self.divPrefixId;
        $(this.el).append(_.template(tpl, templateData));
        console.log("************MODEL*************");
        console.log(this.model);
        var shortOriginalFilename = this.model.getVisibleName(window.app.status.currentProjectModel.get('blindMode'));
        if (shortOriginalFilename.length > 25) {
            shortOriginalFilename = shortOriginalFilename.substring(0, 23) + "...";
        }

        var tabTpl =
            "<li>" +
                "<a style='float: left;' id='" + self.divPrefixId + "-<%= idImage %>' rel='tooltip' title='<%= originalFilename %>' href='#" + self.divPrefixId + "-<%= idProject %>-<%= idImage %>-' data-toggle='tab'>" +
                "<i class='icon-search' /> <%= shortOriginalFilename %> " +
                "</a>" +
                "</li>";

        var dataName = 'data-name=<%= idImage %>';

        var tabs = $('#explorer-tab');
        tabs.append(_.template(tabTpl, { idProject: window.app.status.currentProject, idImage: this.model.get('id'), originalFilename: this.model.get('originalFilename'), shortOriginalFilename: shortOriginalFilename}));
        var dropdownTpl = '<li class="dropdown"><a href="#" id="' + self.divPrefixId + '-<%= idImage %>-dropdown" class="dropdown-toggle" data-toggle="dropdown"><b class="caret"></b></a><ul class="dropdown-menu"><li><a href="#tabs-dashboard-<%= idProject %>" data-toggle="tab" data-image="<%= idImage %>" class="closeTab" id="closeTab' + self.divPrefixId + '-<%= idImage %>"><i class="icon-remove" /> Close</a></li></ul></li>';
        tabs.append(_.template(dropdownTpl, { idProject: window.app.status.currentProject, idImage: this.model.get('id'), filename: this.model.get('filename')}));

        if (this.review && this.model.get('reviewed')) {
            self.changeValidateColor(true);
        }
        else if (this.review && this.model.get('inReview')) {
            self.changeValidateColor(false);
        }

        this.initToolbar();

        if (this.review) {
            console.log("this.review=" + this.review);
            new UserJobCollection({project: window.app.status.currentProject, image: self.model.id}).fetch({
                success: function (collection, response) {
                    self.userJobForImage = collection;
                    self.initMap();
                    self.initAnnotationsTabs();
                    if (self.iPad) {
                        self.initMobile();
                    }
                }
            });
        } else {
            this.initMap();
            this.initAnnotationsTabs();
            if (this.iPad) {
                this.initMobile();
            }
        }
        return this;
    },
    changeValidateColor: function (isValidate) {
        var self = this;
        var color = ""
        if (isValidate) {
            color = "#5BB75B";
        }
        else {
            color = "#BD362F";
        }
        var tabs = $("#explorer-tab-content");
        tabs.find("a#" + self.divPrefixId + "-" + self.model.id).css("background-color", color);
    },
    initMobile: function () {


    },
    isCurrentAnnotationUser: function () {
        console.log("isCurrentAnnotationUser=" + window.app.models.projectUser.get(this.currentAnnotation.get('user')));
        return window.app.models.projectUser.get(this.currentAnnotation.get('user')) != undefined
    },
    addTermToReviewPanel: function (idTerm) {
        console.log("addTermToReviewPanel=" + idTerm);
        if (this.review) {
            this.reviewPanel.addTermChoice(idTerm, this.currentAnnotation.id);
        }
    },
    deleteTermFromReviewPanel: function (idTerm) {
        if (this.review) {
            this.reviewPanel.deleteTermChoice(idTerm, this.currentAnnotation.id);
        }
    },
    /**
     * Grab the layout and call ask for render
     */
    render: function () {
        var self = this;
        //var template = (this.iPad) ? "text!application/templates/explorer/BrowseImageMobile.tpl.html" : "text!application/templates/explorer/BrowseImage.tpl.html";
        require(["text!application/templates/explorer/BrowseImage.tpl.html"
        ], function (tpl) {
            self.doLayout(tpl);
        });
        return this;
    },

    /**
     * Check init options and call appropriate methods
     */
    registerEventTile: function (layer) {

        var self = this;
        layer.events.register("loadstart", layer, function () {
        });

        layer.events.register("tileloaded", layer, function (evt) {
            return; //disabled but works
            var ctx = evt.tile.getCanvasContext();
            if (ctx) {
                var imgd = ctx.getImageData(0, 0, evt.tile.size.w, evt.tile.size.h);
                //process PIX
                //Processing.Threshold.process({canvas :imgd, threshold : 165});

                /*Processing.ColorChannel.process({canvas :imgd, channel : Processing.ColorChannel.GREEN});
                 Processing.ColorChannel.process({canvas :imgd, channel : Processing.ColorChannel.BLUE});*/

                ctx.putImageData(imgd, 0, 0);
                evt.tile.imgDiv.removeAttribute("crossorigin");
                evt.tile.imgDiv.src = ctx.canvas.toDataURL();

            }
        });

        layer.events.register("loadend", layer, function () {
        });

    },

    show: function (options) {
        var self = this;

        console.log("show!");
        console.log(options.goToAnnotation);
        if (options.goToAnnotation != undefined && options.goToAnnotation.value!=undefined) {

            new AnnotationModel({id: options.goToAnnotation.value}).fetch({
                success: function (annotation, response) {
                    var layer = _.find(self.layers, function (layer) {
                        return layer.userID == annotation.get("user")
                    });
                    if (layer) {
                        layer.showFeature(annotation.get("id"));
                        self.goToAnnotation(layer, annotation);
                        self.setLayerVisibility(layer, true);
                        setTimeout(function () {
                            var feature = layer.getFeature(annotation.id)
                            if (feature) {
                                layer.selectFeature(feature);
                            }
                        }, 1000);//select feature once layer is readed. Should be triggered by event...
                    } else {
                        new UserModel({id: annotation.get('user')}).fetch({
                            success: function (userAlgo, response) {
                                var layer = new AnnotationLayer(userAlgo.get('username'), self.model.get('id'), annotation.get('user'), "", self.ontologyPanel.ontologyTreeView, self, self.map, this.review);
                                layer.isOwner = false;
                                layer.loadAnnotations(self);
                                layer.registerEvents(self.map);
                                layer.showFeature(annotation.get("id"));
                                self.goToAnnotation(layer, annotation);
                                self.setLayerVisibility(layer, true);
                            }
                        });

                    }
                }
            });
        }
    },

    refreshAnnotationTabs: function (idTerm) {
        this.annotationsPanel.refreshAnnotationTabs(idTerm);
    },

    setAllLayersVisibility: function (visibility) {
        var self = this;
        _.each(this.layers, function (layer) {
            self.setLayerVisibility(layer, visibility);
        });
    },
    setLayerVisibility: function (layer, visibility) {
        // manually check (or uncheck) the checkbox in the menu:
        $("#" + this.divId).find("#layerSwitcher" + this.model.get("id")).find("ul.annotationLayers").find(":checkbox").each(function () {
            if (layer.name != $(this).attr("value")) {
                return;
            }
            if (visibility) {
                if ($(this).attr("checked") != "checked") {
                    this.click();
                }
            } else {
                if ($(this).attr("checked") == "checked") {
                    this.click();
                }
            }
        });
    },
    switchControl: function (controlName) {
        var toolbar = $("#" + this.divId).find('#toolbar' + this.model.get('id'));
        toolbar.find('input[id=' + controlName + this.model.get('id') + ']').click();
    },
    getZoomLevel: function () {
        return this.map.zoom
    },
    /**
     * Move the OpenLayers view to the Annotation, at the
     * optimal zoom
     * @param layer The vector layer containing annotations
     * @param idAnnotation the annotation
     */
    goToAnnotation: function (layer, annotation) {
        var self = this;
        var format = new OpenLayers.Format.WKT();
        var point = format.read(annotation.get("location"));
        var geom = point.geometry;
        var bounds = geom.getBounds();
        //Compute the ideal zoom to view the feature
        var featureWidth = bounds.right - bounds.left;
        var featureHeight = bounds.top - bounds.bottom;
        var windowWidth = $(window).width();
        var windowHeight = $(window).height();
        var zoom = self.map.getNumZoomLevels() - this.nbDigitialZoom;
        var tmpWidth = featureWidth;
        var tmpHeight = featureHeight;
        while ((tmpWidth > windowWidth) || (tmpHeight > windowHeight)) {
            tmpWidth /= 2;
            tmpHeight /= 2;
            zoom--;
        }
        zoom = Math.max(0, zoom - 1);
        //zoom = Math.max(0, zoom-1);
        self.map.moveTo(new OpenLayers.LonLat(geom.getCentroid().x, geom.getCentroid().y), Math.max(0, zoom));
    },
    getFeature: function (idAnnotation) {
        return this.userLayer.getFeature(idAnnotation);
    },
    removeFeature: function (idAnnotation) {
        return this.userLayer.removeFeature(idAnnotation);
    },
    /**
     * Callback used by AnnotationLayer at the end of theirs initializations
     * @param layer
     */
    layerLoadedCallback: function (layer) {
        var self = this;
        this.layersLoaded++;

        if (self.review == false && this.layersLoaded == (window.app.models.userLayer.length + 1)) { //+1 for review layer

            //Init Controls on Layers
            var vectorLayers = _.map(this.layers, function (layer) {
                return layer.vectorsLayer;
            });
            var selectFeature = new OpenLayers.Control.SelectFeature(vectorLayers);
            _.each(this.layers, function (layer) {
                layer.initControls(self, selectFeature);
                layer.registerEvents(self.map);
                if (layer.isOwner) {
                    self.userLayer = layer;
                    layer.vectorsLayer.setVisibility(true);
                    layer.toggleIrregular();
                    //Simulate click on None toolbar
                    var toolbar = $("#" + self.divId).find('#toolbar' + self.model.get('id'));
                    toolbar.find('input[id=none' + self.model.get('id') + ']').click();
                } else {
                    layer.controls.select.activate();
                    layer.vectorsLayer.setVisibility(false);
                }
            });

            if (_.isFunction(self.initCallback)) {
                self.initCallback.call();
            }

            self.initAutoAnnoteTools();
            self.createAnnotationPropertiesPanel();
        }
    },
    /**
     * Return the AnnotationLayer of the logged user
     */
    getUserLayer: function () {
        return this.userLayer;
    },
    getUserAndReviewLayer: function () {
        console.log("getUserAndReviewLayer.user=" + this.userLayer.name);
        console.log("getUserAndReviewLayer.review=" + this.reviewPanel.reviewLayer.name);
        return {user: this.userLayer, review: this.reviewPanel.reviewLayer};
    },
    /**
     * Initialize the OpenLayers Map
     */
    initMap: function () {
        var self = this;
        var mime = this.model.get('mime');


        if (mime == "vms" || mime == "mrxs" || mime == "tif" || mime == "tiff" || mime == "svs" || mime == "jp2") {
            self.initIIP();
        }
    },
    /**
     * Add a base layer (image) on the Map
     * @param layer the layer to add
     */
    addBaseLayer: function (layer) {
        var self = this;
        this.map.addLayer(layer);
        this.baseLayers.push(layer);
        self.map.setBaseLayer(layer);
        if (!this.review) {
            this.layerSwitcherPanel.addBaseLayer(layer, this.model);
        }
    },

    /**
     * Add a vector layer on the Map
     * @param layer the layer to add
     * @param userID the id of the user associated to the layer
     */
    reviewLayer: null,
    addVectorLayer: function (layer, userID) {
        console.log("addVectorLayer");
        layer.vectorsLayer.setVisibility(false);
        this.map.addLayer(layer.vectorsLayer);

        if (userID == 0) {
            this.reviewLayer = layer;
        }

        this.layers.push(layer);

        if (!this.review) {
            this.layerSwitcherPanel.addVectorLayer(layer, this.model, userID);
        } else {
            this.reviewPanel.addVectorLayer(layer, this.model, userID);
            this.map.raiseLayer(this.reviewLayer.vectorsLayer, 1000);
        }
    },
    showAnnotationInReviewPanel: function (annotation) {
        console.log("showAnnotationInReviewPanel");
        if (this.review) {
            this.reviewPanel.showCurrentAnnotation(annotation);
        }
    },
    /**
     * Create a draggable Panel containing Layers names
     * and tools
     */
    createLayerSwitcher: function () {
        this.layerSwitcherPanel = new LayerSwitcherPanel({
            browseImageView: this,
            model: this.model,
            el: this.el
        }).render();
        this.createNumberOfAnnotationPerUser();
    },
    createReviewPanel: function () {
        var self = this;
        this.reviewPanel = new ReviewPanel({
            browseImageView: self,
            model: self.model,
            el: self.el,
            userLayers: window.app.models.projectUser,
            userJobLayers: self.userJobForImage
        }).render();
    },
    createNumberOfAnnotationPerUser : function() {
        console.log("createNumberOfAnnotationPerUser");
        var self = this;
        var refreshData = function() {
            $.get("/api/imageinstance/"+self.model.id+"/annotationindex.json", function(data) {
                console.log("GET REFRESH");
                var totalReviewed = 0;
                _.each (data.collection, function (item){
                    //
                    var span = $("li#entry"+item.user).find("span.numberOfAnnotation")
                    if(span.length>0) {
                        span.empty();
                        span.append("("+item.countAnnotation+")");
                    }
                    totalReviewed = totalReviewed + item.countReviewedAnnotation;
                });
                var span = $("li#entryREVIEW").find("span.numberOfAnnotation");
                span.empty();
                span.append("("+totalReviewed+")");
            });
        }
        refreshData();
        var interval = setInterval(refreshData, 5000);
        $(window).bind('hashchange', function () {
            clearInterval(interval);
        });

    } ,

    createAnnotationPropertiesPanel : function() {
      //annotationProperties
        var self = this;
        //Creation du layer Property
        var layerAnnotProp = new AnnotationPropertyLayer(self.model.get('id'), window.app.status.user.id, self, self.map);
        this.annotationProperties = new AnnotationPropertyPanel({
            browseImageView: self,
            model: self.model,
            el: self.el,
            layer : layerAnnotProp
        }).render();
    },
    createInformationPanel: function () {
        var self = this;
        this.informationsPanel = new InformationsPanel({
            browseImageView: self,
            model: self.model,
            el: self.el
        }).render();
    },
    createMultiDimensionPanel: function () {
        var self = this;
        console.log("createMultiDimensionPanel");
        this.multidimensionPanel = new MultiDimensionPanel({
            browseImageView: self,
            model: self.model,
            el: self.el
        }).render();
    },
    /**
     * Create a draggable Panel containing a OverviewMap
     */
    createOverviewMap: function () {
        new OverviewMapPanel({
            model: this.model,
            el: this.el,
            browseImageView: this
        }).render();
    },
    /**
     * Init the Map if ImageServer is IIPImage
     */
    initIIP: function () {
        var self = this;

        //HACK : Set the height of the map manually
        var paddingTop = 96;
        var height = $(window).height() - paddingTop;
        $("#" + self.divId).find("#map" + self.divPrefixId + self.model.get('id')).css("height", height);
        $("#" + self.divId).find("#map" + self.divPrefixId + self.model.get('id')).css("width", "100%");
        $(window).resize(function () {
            var height = $(window).height() - paddingTop;
            $("#" + self.divId).find("#map" + self.divPrefixId + self.model.get('id')).css("height", height);
        });

        var initZoomifyLayer = function (metadata, zoomify_urls, imageFilters) {
            if (!self.review) {
                self.createLayerSwitcher();
                $(".reviewPanel").hide();
            }
            else {
                self.createReviewPanel();
                $(".layerSwitcherPanel").hide();
                console.log("LAYER SWITECHER=" + $(".layerSwitcherPanel").length)
            }
            self.createInformationPanel();
            self.createMultiDimensionPanel();
            //self.initImageFiltersPanel();
            //var numZoomLevels =  metadata.nbZoom;
            /* Map with raster coordinates (pixels) from Zoomify image */
            var serverResolutions = [];
            for (var z = metadata.nbZoom - 1; z >= 0; z--) {
                serverResolutions.push(Math.pow(2, z));
            }
            var resolutions = _.union(serverResolutions, self.digitalResolutions)
            var options = {
                theme : null,
                maxExtent: new OpenLayers.Bounds(0, 0, metadata.width, metadata.height),
                resolutions: resolutions,
                serverResolutions: serverResolutions,
                units: 'pixels',
                tileSize: new OpenLayers.Size(self.tileSize, self.tileSize),
                controls: [
                    new OpenLayers.Control.TouchNavigation({
                        dragPanOptions: {
                            enableKinetic: window.app.view.isMobile
                        }
                    }),
                    new OpenLayers.Control.Navigation({dragPanOptions: {enableKinetic: window.app.view.isMobile}}),
                    new OpenLayers.Control.ZoomPanel(),
                    /*new OpenLayers.Control.MousePosition({
                     }),*/
                    new OpenLayers.Control.KeyboardDefaults()],
                eventListeners: {

                    "zoomend": function (event) {
                        var map = event.object;
                        var maxMagnification = self.model.get("magnification") * Math.pow(2, self.nbDigitialZoom);
                        var deltaZoom = map.getNumZoomLevels() - map.getZoom() - 1;

                        var magnification = maxMagnification;
                        if (deltaZoom != 0) {
                            magnification = maxMagnification / (Math.pow(2, deltaZoom));
                        }
                        magnification = Math.round(magnification * 100) / 100;
                        if (magnification > self.model.get("magnification")) {
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).css("color", "red");
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).html("magnitude : " + magnification + "X<br/>digital");
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).css("height", 40);
                        } else {
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).css("color", "white");
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).html("magnitude : " + magnification + "X");
                            $("#" + self.divId).find("#zoomInfoPanel" + self.model.id).css("height", 20);
                        }

                        self.broadcastPosition();
                    },
                    "moveend": function () {
                        self.broadcastPosition();
                    },
                    "mousemove": function (e) {

                    }

                }
            };

            var overviewMap = new OpenLayers.Layer.Image(
                "Overview" + self.model.get("id"),
                self.model.get("thumb"),
                new OpenLayers.Bounds(0, 0, metadata.width, metadata.height),
                new OpenLayers.Size(metadata.overviewWidth, metadata.overviewHeight)
            );

            self.createOverviewMap();
            var overviewMapControl = new OpenLayers.Control.OverviewMap({
                size: new OpenLayers.Size(metadata.overviewWidth, metadata.overviewHeight),
                layers: [overviewMap],
                div: $("#" + self.divId).find('#overviewmapcontent' + self.model.get('id'))[0],
                minRatio: 1,
                maxRatio: 1024,
                mapOptions: {
                    maxExtent: new OpenLayers.Bounds(0, 0, metadata.width, metadata.height),
                    maximized: true
                }
            });


            self.map = new OpenLayers.Map("map" + self.divPrefixId + self.model.get('id'), options);
            self.map.events.register('mousemove', self.map, function (e) {
                var point = self.map.getLonLatFromPixel( this.events.getMousePosition(e) )
                var coordinates = _.template(" x : <%= x %>, y : <%= y %>", {x: point.lon, y: point.lat});
                $('#mousePositionContent' + self.model.id).html(coordinates);
            });
            self.initOntology();
            window.app.view.applyPreferences();

            var baseLayer = new OpenLayers.Layer.Zoomify(
                "Original",
                zoomify_urls,
                new OpenLayers.Size(metadata.width, metadata.height),
                {tileOptions: {crossOriginKeyword: 'anonymous'}}
            );

            baseLayer.transitionEffect = 'resize';
            baseLayer.getImageSize = function () {
                if (arguments.length > 0) {
                    bounds = this.adjustBounds(arguments[0]);
                    var z = this.map.getZoom();
                    var res = this.map.getResolution();
                    var x = Math.round((bounds.left - this.tileOrigin.lon) / (res * this.tileSize.w));
                    var y = Math.round((this.tileOrigin.lat - bounds.top) / (res * this.tileSize.h));
                    //check if tiles exist on server at this zoom level, if not return
                    if (this.tierImageSize[z] == undefined) {
                        return null;
                    }
                    var w = this.standardTileSize;
                    var h = this.standardTileSize;
                    if (x == this.tierSizeInTiles[z].w - 1) {
                        w = this.tierImageSize[z].w % this.standardTileSize;
                        if (w == 0) {
                            w = this.standardTileSize;
                        }
                    }
                    if (y == this.tierSizeInTiles[z].h - 1) {
                        h = this.tierImageSize[z].h % this.standardTileSize;
                        if (h == 0) {
                            h = this.standardTileSize;
                        }
                    }
                    return (new OpenLayers.Size(w, h));
                } else {
                    return this.tileSize;
                }
            };
            imageFilters.each(function (imageFilter) {
                var url = _.map(zoomify_urls, function (url) {
                    return imageFilter.get('processingServer') + imageFilter.get("baseUrl") + url;
                });
                var layer = new OpenLayers.Layer.Zoomify(
                    imageFilter.get("name"),
                    url,
                    new OpenLayers.Size(metadata.width, metadata.height));
                /*layer.transitionEffect = 'resize';*/

                self.addBaseLayer(layer);
                self.registerEventTile(layer);
            });
            self.registerEventTile(baseLayer);
            self.addBaseLayer(baseLayer);

            self.map.zoomToMaxExtent();
            self.map.addControl(overviewMapControl);

            //Compute the ideal initial zoom
            var windowWidth = $(window).width();
            var windowHeight = $(window).height() - paddingTop;
            var imageWidth = metadata.width;
            var imageHeight = metadata.height;
            var idealZoom = metadata.nbZoom;
            while (imageWidth > windowWidth || imageHeight > windowHeight) {
                imageWidth /= 2;
                imageHeight /= 2;
                idealZoom--;
            }
            self.map.zoomTo(idealZoom);


            //broadcast position every 5 seconds even if user id idle
            self.initBroadcastingInterval();
            //check users online of this image
            if (!self.review) {
                self.initWatchOnlineUsersInterval();
            }

        }

        var t_width = self.model.get("width");
        var t_height = self.model.get("height");
        var nbZoom = 1;
        while (t_width > self.tileSize || t_height > self.tileSize) {
            nbZoom++;
            t_width = Math.floor(t_width / 2);
            t_height = Math.floor(t_height / 2);
        }
        var metadata = {width: self.model.get("width"), height: self.model.get("height"), nbZoom: nbZoom, overviewWidth: 200, overviewHeight: Math.round((200 / self.model.get("width") * self.model.get("height")))};
        new ImageServerUrlsModel({id: self.model.get('baseImage')}).fetch({
            success: function (model, response) {
                new ProjectImageFilterCollection({ project: self.model.get("project")}).fetch({
                    success: function (imageFilters, response) {
                        initZoomifyLayer(metadata, model.get('imageServersURLs'), imageFilters);
                    }
                });

            }
        });
    },
    broadcastPosition: function () {
        var image = this.model.get("id");
        var lonLat = this.map.getExtent().getCenterLonLat();
        var lon = lonLat.lon;
        var lat = lonLat.lat;
        var zoom = this.map.zoom;
        if (zoom == null || lon == null || lat == null) {
            return;
        } //map not yet initialized
        new UserPositionModel({ lon: lon, lat: lat, zoom: zoom, image: image}).save();
    },
    reloadAnnotation: function (idAnnotation) {
        var self = this;
        self.removeFeature(idAnnotation);
        new AnnotationModel({id: idAnnotation}).fetch({
            success: function (annotation, response) {
                var feature = AnnotationLayerUtils.createFeatureFromAnnotation(annotation);
                self.userLayer.addFeature(feature);
                self.userLayer.selectFeature(feature);
            }
        });
    },
    initBroadcastingInterval: function () {
        var self = this;
        this.broadcastPositionInterval = setInterval(function () {
            self.broadcastPosition();
        }, 5000);
        window.app.view.intervals.push(this.broadcastPositionInterval);
    },
    stopBroadcastingInterval: function () {
        clearInterval(this.broadcastPositionInterval);
    },
    initWatchOnlineUsersInterval: function () {
        var self = this;
        if (this.review) {
            return;
        }
        this.watchOnlineUsersInterval = setInterval(function () {
            new UserOnlineModel({image: self.model.get("id")}).fetch({
                success: function (model, response) {
                    var usersOnlineArray = model.get("users").split(",");
                    self.layerSwitcherPanel.updateOnlineUsers(usersOnlineArray);
                }
            });
        }, 5000);
        window.app.view.intervals.push(this.watchOnlineUsersInterval);
    },
    stopWatchOnlineUsersInterval: function () {
        clearInterval(this.watchOnlineUsersInterval);
    },
    initAutoAnnoteTools: function () {
        var self = this;
        var processInProgress = false;
        var handleMapClick = function handleMapClick(evt) {
            if (!self.getUserLayer().magicOnClick) {
                return;
            }

            if (processInProgress) {
                window.app.view.message("Warning", "Magic Wand in progress...", "warning");
                return;
            }
            processInProgress = true;
            var tiles = self.map.baseLayer.grid;
            var newCanvas = document.createElement('canvas');
            var newContext = newCanvas.getContext("2d");
            var newCanvasWidth = tiles[0].length * tiles[0][0].size.w;
            var newCanvasHeight = tiles.length * tiles[0][0].size.h;
            newCanvas.width = newCanvasWidth;
            newCanvas.height = newCanvasHeight;
            newCanvas.display = 'none';
            document.body.appendChild(newCanvas);
            var mapContainerDiv = $("#maptabs-image" + self.model.id).children().children()[0];
            var viewPositionLeft = parseInt($(mapContainerDiv).css("left"), 10);
            var viewPositionTop = parseInt($(mapContainerDiv).css("top"), 10);
            for (var row = 0; row < tiles.length; row++) {
                for (var col = 0; col < tiles[row].length; col++) {
                    var tile = tiles[row][col];
                    var tileCtx = tile.getCanvasContext();
                    if (tileCtx) {
                        newContext.drawImage(
                            tileCtx.canvas,
                            viewPositionLeft + tile.position.x,
                            viewPositionTop + tile.position.y);
                    }
                }
            }
            var startX = evt.xy.x;
            var startY = evt.xy.y;

            var imgd = newContext.getImageData(0, 0, newCanvasWidth, newCanvasHeight);
            //TMP HACK in order to decide if we use the GREEN Channel or not
            var toleranceKey = "mw_tolerance" + window.app.status.currentProject;
            var thresholdKey = "th_threshold" + window.app.status.currentProject;
            var tolerance = localStorage.getObject(toleranceKey) || Processing.MagicWand.defaultTolerance;
            var threshold = localStorage.getObject(thresholdKey) || Processing.Threshold.defaultTheshold;
            console.log("threshold=" + threshold);
            console.log("tolerance=" + tolerance);
            if (window.app.status.currentProjectModel.get('disciplineName') == 'HISTOLOGY') {
                Processing.ColorChannel.process({canvas: imgd, channel: Processing.ColorChannel.GREEN});
            } else {
                Processing.Threshold.process({canvas: imgd, threshold: threshold});
            }

            //process PIX
            console.log("MagicWand...");
            var wandResult = Processing.MagicWand.process({
                canvas: imgd,
                canvasWidth: newCanvasWidth,
                canvasHeight: newCanvasHeight,
                startX: startX,
                startY: startY,
                tolerance: tolerance
            });
            if (!wandResult.success) {
                processInProgress = false;
                document.body.removeChild(newCanvas);
                window.app.view.message("Warning", "Can't find interesting region", "error");
                return;
            }
            console.log("done");
            console.log("Outline");
            var outline = Processing.Outline.process({
                canvas: imgd,
                canvasWidth: newCanvasWidth,
                canvasHeight: newCanvasHeight,
                bbox: wandResult.bbox
            });
            console.log("done");
            processInProgress = false;
            var debug = false;
            if (debug) {
                newContext.putImageData(imgd, 0, 0);
                newContext.fillStyle = "#FF0000";
                newContext.fillRect(wandResult.bbox.xmin - 5, wandResult.bbox.ymin - 5, 10, 10);
                newContext.fillRect(wandResult.bbox.xmin - 5, wandResult.bbox.ymax - 5, 10, 10);
                newContext.fillRect(wandResult.bbox.xmax - 5, wandResult.bbox.ymin - 5, 10, 10);
                newContext.fillRect(wandResult.bbox.xmax - 5, wandResult.bbox.ymax - 5, 10, 10);
                newContext.fillStyle = "#00FF00";
                newContext.fillRect(outline.startX - 5, outline.startY - 5, 10, 10);
                for (var i = 0; i < outline.points.length; i++) {
                    newContext.fillStyle = "#00FFFF";
                    newContext.fillRect(outline.points[i].x - 1, outline.points[i].y - 1, 3, 3);
                }
            }
            if (!debug) {
                document.body.removeChild(newCanvas);
            }
            var polyPoints = []
            for (var i = 0; i + 5 < outline.points.length; i = i + 5) {
                var _p = self.map.getLonLatFromViewPortPx({ x: outline.points[i].x, y: outline.points[i].y});
                var point = new OpenLayers.Geometry.Point(
                    _p.lon,
                    _p.lat);
                polyPoints.push(point);
            }
            polyPoints.push(polyPoints[0]);
            var linear_ring = new OpenLayers.Geometry.LinearRing(polyPoints);
            var polygonFeature = new OpenLayers.Feature.Vector(
                new OpenLayers.Geometry.Polygon([linear_ring]), null, {});
            self.getUserLayer().addAnnotation(polygonFeature);


        }
        if (self.getUserLayer() != undefined) {
            //self.map.events.register("touchend", self.getUserLayer().vectorsLayer, handleMapClick); // evt.xy = null on ipad :(
            self.map.events.register("click", self.getUserLayer().vectorsLayer, handleMapClick);
        }
    },
    freeHandUpdateAdd: false,
    freeHandUpdateRem: false,
    /**
     * Init the toolbar
     */
    initToolbar: function () {

        var self = this;
        var toolbar = $("#" + self.divId).find('#toolbar' + this.model.get('id'));
        $("#" + self.divId).find('a[id=none' + this.model.get('id') + ']').click(function () {
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("none");
            self.getUserLayer().enableHightlight();
        });
        toolbar.find('a[id=select' + this.model.get('id') + ']').click(function () {
            self.getUserLayer().toggleControl("select");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=point' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("point");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=regular4' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().setSides(4);
            self.getUserLayer().toggleControl("regular");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=regular30' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().setSides(15);
            self.getUserLayer().toggleControl("regular");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=polygon' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("polygon");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=freehand' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("freehand");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=freeAdd' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = true;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("freehand");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=freeRem' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = true;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("freehand");
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=magic' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("select");
            self.getUserLayer().magicOnClick = true;
            self.getUserLayer().disableHightlight();
        });
        if (this.iPad) {
            toolbar.find('a[id=magic' + this.model.get('id') + ']').hide();
        }
        toolbar.find('a[id=modify' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            if (!self.review) {
                self.getUserLayer().toggleEdit();
                self.getUserLayer().toggleControl("modify");
                self.getUserLayer().disableHightlight();
            } else {
                self.getUserAndReviewLayer().user.toggleEdit();
                self.getUserAndReviewLayer().user.toggleControl("modify");
                self.getUserAndReviewLayer().user.disableHightlight();
                self.getUserAndReviewLayer().review.toggleEdit();
                self.getUserAndReviewLayer().review.toggleControl("modify");
                self.getUserAndReviewLayer().review.disableHightlight();
            }

        });
        toolbar.find('a[id=delete' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("select");
            self.getUserLayer().deleteOnSelect = true;
            self.getUserLayer().disableHightlight();
        });
        toolbar.find('a[id=rotate' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            if (!self.review) {
                self.getUserLayer().toggleRotate();
                self.getUserLayer().disableHightlight();
            } else {
                self.getUserAndReviewLayer().user.toggleRotate();
                self.getUserAndReviewLayer().user.disableHightlight();
                self.getUserAndReviewLayer().review.toggleRotate();
                self.getUserAndReviewLayer().review.disableHightlight();
            }
        });
        toolbar.find('a[id=fill' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            var annotation = self.currentAnnotation;
            if (annotation) {
                new AnnotationModel({id: annotation.id, fill: true}).save({}, {
                    success: function (annotation, response) {
                        window.app.view.message("Annotation edited", response.message, "success");
                        if (!self.review) {
                            self.getUserLayer().vectorsLayer.refresh()
                        } else {
                            self.getUserAndReviewLayer().user.vectorsLayer.refresh()
                            self.getUserAndReviewLayer().review.vectorsLayer.refresh()
                        }
                    },
                    error: function (model, response) {
                        var json = $.parseJSON(response.responseText);
                        window.app.view.message("Annotation", json.errors, "");
                    }
                });
            } else {
                window.app.view.message("Annotation", "You must select an annotation!", "error");
            }  //vectorsLayer.refresh()


            return false;

        });
        toolbar.find('a[id=resize' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            if (!self.review) {
                self.getUserLayer().toggleResize();
                self.getUserLayer().disableHightlight();
            } else {
                self.getUserAndReviewLayer().user.toggleResize();
                self.getUserAndReviewLayer().user.disableHightlight();
                self.getUserAndReviewLayer().review.toggleResize();
                self.getUserAndReviewLayer().review.disableHightlight();
            }

        });
        toolbar.find('a[id=drag' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            if (!self.review) {
                self.getUserLayer().toggleDrag();
                self.getUserLayer().disableHightlight();
            } else {
                self.getUserAndReviewLayer().user.toggleDrag();
                self.getUserAndReviewLayer().user.disableHightlight();
                self.getUserAndReviewLayer().review.toggleDrag();
                self.getUserAndReviewLayer().review.disableHightlight();
            }
        });
        toolbar.find('a[id=ruler' + this.model.get('id') + ']').click(function () {
            self.freeHandUpdateAdd = false;
            self.freeHandUpdateRem = false;
            self.getUserLayer().controls.select.unselectAll();
            self.getUserLayer().toggleControl("line");
            self.getUserLayer().measureOnSelect = true;
            self.getUserLayer().disableHightlight();
        });


        /*toolbar.find('input[id=irregular' + this.model.get('id') + ']').click(function () {
         self.getUserLayer().toggleIrregular();
         });
         toolbar.find('input[id=irregular' + this.model.get('id') + ']').hide();*/

    },
    /**
     * Collect data and call appropriate methods in order to add Vector Layers on the Map
     */
    initVectorLayers: function (ontologyTreeView) {
        var self = this;
        if (!self.review) {
            var project = window.app.status.currentProjectModel;
            var projectUsers = window.app.models.projectUser.select(function (user) {
                return window.app.models.userLayer.get(user.id) != undefined;
            });
            _.each(projectUsers, function (user) {
                var layerAnnotation = new AnnotationLayer(user.prettyName(), self.model.get('id'), user.get('id'), user.get('color'), ontologyTreeView, self, self.map, self.review);
                layerAnnotation.isOwner = (user.get('id') == window.app.status.user.id);
                layerAnnotation.loadAnnotations(self);
            });
            //init review layer in explore mode
            var layerAnnotation = new AnnotationLayer("Review layer", self.model.get('id'), "REVIEW", "", ontologyTreeView, self, self.map, self.review);
            layerAnnotation.isOwner = false;
            layerAnnotation.loadAnnotations(self);
        } else {

            self.reviewPanel.addReviewLayerToReview();
            console.log("##########");
            console.log(this.divId + " => addLayerToReview");
            self.reviewPanel.addLayerToReview(window.app.status.user.id);
            self.reviewPanel.removeLayerFromReview(window.app.status.user.id);
            self.reviewPanel.addLayerToReview(window.app.status.user.id);

        }

    },
    refreshReviewLayer: function () {
        if (this.reviewPanel) {
            this.reviewPanel.reviewLayer.vectorsLayer.refresh();
        }
    },
    initAnnotationsTabs: function () {
        this.annotationsPanel = new AnnotationsPanel({
            el: this.el,
            model: this.model,
            browseImageView: this
        }).render();

    },
    clickSelect: function () {
        var self = this;
        $("#" + self.divId).find('#toolbar' + self.model.get('id')).find('a#select' + self.model.get('id')).click();
    },
    /**
     * Create a draggable Panel containing a tree which represents the Ontology
     * associated to the Image
     */
    initOntology: function () {
        var self = this;
        self.ontologyPanel = new OntologyPanel({
            el: this.el,
            model: this.model,
            callback: self.initVectorLayers,
            browseImageView: self
        }).render();

    },
    initImageFiltersPanel: function () {
        var self = this;
        self.imageFiltersPanel = new ImageFiltersPanel({
            el: this.el,
            model: this.model,
            browseImageView: self
        }).render();
    },
    /**
     * Bind controls to the map
     * @param controls the controls we want to bind
     */
    initTools: function (controls) {
        for (var key in controls) {
            this.map.addControl(controls[key]);
        }
    },
    validatePicture: function () {
        var self = this;
        console.log("validateImage");
        new ImageReviewModel({id: self.model.id}).destroy({
            success: function (model, response) {
                window.app.view.message("Image", response.message, "success");
                self.model = new ImageModel(response.imageinstance);
                self.changeValidateColor(true);
                self.reviewPanel.refresh(self.model);
            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Image", json.errors, "error");
            }});
    },
    unvalidatePicture: function () {
        var self = this;
        console.log("cancelReviewing");
        new ImageReviewModel({id: self.model.id, cancel: true}).destroy({
            success: function (model, response) {
                window.app.view.message("Image", response.message, "success");
                self.model = new ImageModel(response.imageinstance);
                self.changeValidateColor(false);
                self.reviewPanel.refresh(self.model);
            },
            error: function (model, response) {
                var json = $.parseJSON(response.responseText);
                window.app.view.message("Image", json.errors, "error");
            }});

    }
});



