P.when('A', 'sg-jsutil', 'a-modal', 'gw-productdb', 'productdb-binding-helper', 'sg-media-builder', 'gw-sims')
   .register('gw-popover', function (A, jsutil, modal, pdb, PdbBinder, MediaBuilder, GwSims) {
    
      if (A.$('html').hasClass('a-touch')) return;

    var $ = A.$,
        $dummyNode = $('<span style="display: none" />').appendTo('body'),
        $content = $('#gw-popover-wrapper'),
        binder = new PdbBinder(pdb, $content),
        dialog = modal.create($dummyNode, {
          'name'        : 'gw-asin-popover',
          'width'       : '90%',
          'max-width'   : 900,
          'height'      : 590,
          'closeButton' : false });

    var $quickLook = $('#gw-quick-look-btn');
    $('#a-page').delegate('li[data-sgproduct]', 'mouseenter', function(e) {
      $(e.currentTarget).append($quickLook);
      $(e.currentTarget).find('[title]').removeAttr('title');
      $quickLook.addClass('active');
    });

    $('#a-page').delegate('li[data-sgproduct]', 'mouseleave', function(e) {
      $quickLook.removeClass('active');
    });


    var dialogSelector = '#a-popover-' + dialog.attrs('id') + ' ',
        rules = [
          '.a-popover-header { display: none; }',
          '.a-popover-inner { padding: 0px !important; margin: 0px !important; overflow: hidden !important; height: 100% !important; }'
        ];
        dialogCss = $.map(rules, function(val) { return dialogSelector + val }).join(' ');

    $('head').append('<style>' + dialogCss + '</style>');
    var sims = new GwSims(binder);

    A.on("a:popover:hide:gw-asin-popover", function(data){
      if(window.history.state && window.history.state.popup) {
        window.history.back();
      }
      binder.clear();
    });

    A.$(window).bind('popstate', function(){ dialog.hide(); });

    return {
      show: function(asin, url) {
        if(window.history && window.history.pushState) {
          window.history.pushState({popup:1},'');
        }
        binder.setAsin(asin, {
          'beforeUpdate': function(product) {
           if(product.loading) {
              if(typeof ue == 'object') {
                ue.count("freshPopOverLoading", (ue.count("freshPopOverLoading") || 0) + 1);
              }
              return product;
            }
            var media= new MediaBuilder(product.images[0]).autoCrop().scaleXY(500, 400).build(),
                override = {
              'url'   : url,
              'image' : media,
              'bgImage' : { style: "background-image:url(" + media.src + ")" },
              'actionUrl' : { action: '/gp/product/handle-buy-box/' + extractAfterRefPart(url)}
            };


            if(product.reviews) {
              override['reviews'] = $.extend({}, product.reviews, { url: url + '#customerReviews' });
            }
            sims.fetch(product, url);
            
            function extractAfterRefPart(url) {
              return url.substring(url.indexOf("\/ref\=")+1, url.length);
            }
            
            return $.extend({}, product, override);
          }
        });
        dialog.show();
        if(typeof ue == 'object') {
          ue.count("freshPopOverOn", (ue.count("freshPopOverOn") || 0) + 1);
        }
      },
      hide: function() {
        dialog.hide();
      }
    };
  });