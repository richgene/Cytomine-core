Ext.namespace('Cytomine');
Ext.namespace('Cytomine.Project');

Cytomine.Project.Image = function (urls, imageID, filename, path, metadataUrl) {
    this.urls = urls;
    this.imageID = imageID;
    this.filename = filename;
    this.path = path;
    this.metadataUrl = metadataUrl;
    this.userLayer = null;
    this.annotationsLayers = [];
}


Cytomine.Project.Image.prototype = {
    urls : null,
    imageID : null,
    filename : null,
    path : null,
    map : null,
    userLayer : null, //the logged user can draw only on this layer
    annotationsLayers : {},
    getUserLayer : function () {
        console.log("-------this.userLayer is : " + this.imageID);
        return this.userLayer;
    },
    initMap : function () {
        //clear previous overview Map
        //document.getElementById("overviewMap"+this.scanID).innerHTML="";
        console.log("metadataURl" + this.metadataUrl);
        console.log("filename" + this.filename);
        console.log("urls" + this.urls);
        console.log("path" + this.path);
        var openURLLayer = new OpenLayers.Layer.OpenURL( this.filename, this.urls, {transitionEffect: 'resize', layername: 'basic', format:'image/jpeg', rft_id: this.path, metadataUrl: this.metadataUrl} );
        console.log("openURLLayer.viewerLevel " + openURLLayer.getViewerLevel());
        var metadata = openURLLayer.getImageMetadata();
        var resolutions = openURLLayer.getResolutions();
        var maxExtent = new OpenLayers.Bounds(0, 0, metadata.width, metadata.height);
        var tileSize = openURLLayer.getTileSize();
        var lon = metadata.width / 2;
        var lat = metadata.height / 2;
        var overviewBounds = new OpenLayers.Bounds(0,0,metadata.width, metadata.height);
        var mapOptions = {
            maxExtent: overviewBounds,
            maximized : true
        };
        var options = {resolutions: resolutions, maxExtent: maxExtent, tileSize: tileSize, controls: [
            //new OpenLayers.Control.Navigation({zoomWheelEnabled : true, mouseWheelOptions: {interval: 1}, cumulative: false}),
            new OpenLayers.Control.Navigation(),
            new OpenLayers.Control.PanZoomBar(),
            //new OpenLayers.Control.LayerSwitcher({'ascending':false}),
            new OpenLayers.Control.LayerSwitcher({roundedCorner:false,roundedCornerColor: false,'div' : $('layerSwitcher'+this.imageID)}),
            new OpenLayers.Control.MousePosition(),
            new OpenLayers.Control.OverviewMap({
                div : $('overviewMap'+this.imageID),
                //size: new OpenLayers.Size(metadata.width / Math.pow(2, openURLLayer.getViewerLevel()), metadata.height / Math.pow(2,(openURLLayer.getViewerLevel()))),
                size: new OpenLayers.Size(metadata.width / Math.pow(2, openURLLayer.getViewerLevel()), metadata.height / Math.pow(2,(openURLLayer.getViewerLevel()))),
                minRatio : 1,
                maxRatio : 1024,
                mapOptions: mapOptions}),
            new OpenLayers.Control.KeyboardDefaults()
        ]};
        this.map = new OpenLayers.Map("map"+this.imageID, options);
        this.map.addLayer(openURLLayer);
        this.map.setCenter(new OpenLayers.LonLat(lon, lat), 2);
    },
    initTools : function (controls) {
        for(var key in controls) {
            this.map.addControl(controls[key]);
        }
    }
}