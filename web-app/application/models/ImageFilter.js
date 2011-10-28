var ImageFilterModel = Backbone.Model.extend({
   url : function() {
      var base = 'api/imagefilter';
      var format = '.json';
      if (this.isNew()) return base + format;
      return base + (base.charAt(base.length - 1) == '/' ? '' : '/') + this.id + format;
   }
});

var ImageFilterCollection = Backbone.Collection.extend({
   model : ImageFilterModel,
   url : function() {
      return 'api/imagefilter.json';
   }
});

var ProjectImageFilterModel = Backbone.Model.extend({
   url: function() {
      if (this.project != undefined && this.isNew()) {
         return "api/project/" + this.project + "/imagefilter.json";
      } else if (this.project != undefined && this.imageFilter != undefined) {
         return "api/project/" + this.project + "/imagefilter/"+this.imageFilter+".json";
      }
   },
   initialize: function (options) {
      this.id = options.id;
      this.project = options.project;
      this.imageFilter = options.imageFilter;
   }
});

var ProjectImageFilterCollection = Backbone.Collection.extend({
   model : ImageFilterModel,
   url : function() {
      return "api/project/" + this.project + "/imagefilter.json";
   },
   initialize: function (options) {
      this.project = options.project;
   }
});