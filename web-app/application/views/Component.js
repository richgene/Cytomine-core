var Component = Backbone.View.extend({
       tagName: "div",
       views: {},
       firstTimeActivated : true,
       /* Component constructor */
       initialize: function (options) {
          this.divId = options.divId;
          this.el = options.el;
          this.template = options.template;
          this.buttonAttr = options.buttonAttr;
          if (options.activate != undefined) {
             this.activate = options.activate;
          }
          if (options.deactivate != undefined) {
             this.deactivate = options.deactivate;
          }
          if (options.show != undefined) {
             this.show = options.show;
          }
       },
       /**
        *  Render the component into it's DOM element and add it to the menu
        */
       render: function () {
          $(this.el).append(this.template);
          if (this.buttonAttr.elButton) {
             this.addToMenu();
          }
          return this;
       },
       /**
        * Add a button to the menu which activates the components when clicked
        */
       addToMenu: function () {
          var self = this;
          require(["text!application/templates/MenuButton.tpl.html"], function(tpl) {
             var button = _.template(tpl,{
                    id: self.buttonAttr.elButton,
                    route: self.buttonAttr.route,
                    text: self.buttonAttr.buttonText
                 }, true);
             $(self.buttonAttr.buttonWrapper).append(button);
             $("#" + self.buttonAttr.elButton).button({
                    icons: {
                       primary: self.buttonAttr.icon
                    }
                 });
             if (self.buttonAttr.click) {
                $("#" + self.buttonAttr.elButton).click(self.buttonAttr.click);
             }
          });
       },
       /**
        * Show the DOM element and disable the button associated to the component
        **/
       activate: function () {
          if (this.firstTimeActivated) {
             //Init initial page
             window.app.controllers.project.project();
             this.firstTimeActivated = false;
          }
          $("#" + this.divId).show();
          $("#" + this.buttonAttr.elButton).addClass("ui-state-disabled");
       },
       /**
        * Hide the DOM element and enable the button associated
        */
       deactivate: function () {
          $("#" + this.divId).hide();
          $("#" + this.buttonAttr.elButton).removeClass("ui-state-disabled");
       },
       /**
        * Show a subpage of the component
        * - view : the DOM element which contains the content of the page to activate
        * - scope : the DOM element name which contains pages
        * - name : the name of the page to activate
        */
       show: function (view, scope, name) {
          $(scope).find(".title.active").each(function () {
             $(this).removeClass("active");
          });
          $(scope).find("a[name=" + name + "]").addClass("active");
          for (var i in this.views) {
             var v = this.views[i];
             if (v != view) {
                $(v.el).hide();
             }
          }
          $(view.el).show();
       }
    });