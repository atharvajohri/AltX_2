P.when('A', 'sg-jsutil', 'dombinder').register('productdb-binding-helper', function(A, util, binder) {
    var $ = A.$;

    return function(pdb, $root) {
      var self = this,
          _call = util.safeCall,
          product = null,
          productObserver = null,
          ctx = binder.init($root);

      self.setAsin = function(asin, callbacks) {
        var callbacks = callbacks || {};

        _unobserve();
        product = pdb.get(asin);
        _update(product, callbacks);

        if(product.loading) {
          _observe(function(product) {
            _update(product, callbacks);
          });
        }
        return product;
      };

      function _update(product, callbacks) {
        binder.update(ctx, _call(callbacks['beforeUpdate'], product));
        if(!product.loading) {
          _call(callbacks['load'], product);
        }
      }

      self.clear = function() {
        _unobserve();
        product = {};
        binder.update(ctx, product);
      };

      function _observe(callback) {
        _unobserve();
        productObserver = function() {
          callback(product);
        }
        product.pdb_observe(productObserver);
      }

      function _unobserve() {
        if(product && productObserver) {
          product.pdb_unobserve(productObserver);
          productObserver = null;
        }
      }

      function _triggerHandlers(product, callbacks) {
        if(!product.loading) {
          _call(callbacks['load'], product);
        }
      }
    };
  });

  P.when('A').register('dombinder', function(A) {
    function _getProp(obj, path) {
      for (var i = 0, path = path.split('.'), len = path.length; i < len; i++) {
        obj = obj && obj[path[i]];
      }
      return obj;
    }

    var bindingHandlers = {
      'text': {
        update: function(e, v, d) {
          A.$(e).text(_getProp(d, v) || '');
        }
      },
      'html': {
        update: function(e, v, d) {
          A.$(e).html(_getProp(d, v) || '');
        }
      },
      'href': {
        update: function(e, v, d) {
          A.$(e).attr('href', _getProp(d, v) || '');
        }
      },
      'trimText': {
        update: function(e, v, d) {
          var $e = A.$(e),
              txt = $e.text();
          if(txt.length > v) {
            var i = v-4;
            while(i >=0 && "[\.,-\/#!$%\^&\*;:{}=\-_`~()] ".indexOf(txt[i]) > 0) {
              i--;
            }
            $e.text(txt.substring(0, i>=0 ? i+1 : v-3) + '...');
          }
        }
      },
      'value': {
        update: function(e, v, d) {
          A.$(e).val(_getProp(d, v) || '');
        }
      },
      'visible': {
        update: function(e, v, d) {
          var negate = false;
          if(v.charAt(0) === '!') {
            negate = true;
            v = v.substring(1);
          }
          if(negate != !!_getProp(d, v)) {
            A.$(e).show();
          } else {
            A.$(e).hide();
          }
        }
      },
      'css': {
        init: function(e, v) {
          var $e = A.$(e),
              cssState = $e.data('dombcss') || [];
          cssState[v] = '';
          $e.data('dombcss', cssState);
        },
        update: function(e, v, d) {
          var $e = A.$(e),
              cssState = $e.data('dombcss'),
              oldClass = cssState[v],
              newClass = _getProp(d, v);
          if(oldClass !== newClass) {
            cssState[v] = newClass;
            if(oldClass) { $e.removeClass(oldClass); }
            if(newClass) { $e.addClass(newClass); }
          }
        }
      },
      'attr': {
        init: function(e, v) {
          var $e = A.$(e),
              attrState = $e.data('dombattr') || [];
          attrState[v] = {};
          $e.data('dombattr', attrState);
        },
        update: function(e, v, d) {
          var $e = A.$(e),
              attrState = $e.data('dombattr'),
              oldAttrs = attrState[v],
              newAttrs = _getProp(d, v);
          if(oldAttrs !== newAttrs) {
            attrState[v] = newAttrs;
            if(oldAttrs) {
              A.$.each(oldAttrs, function(k, v) {
                $e.removeAttr(k);
              });
            }
            if(newAttrs) {
              A.$.each(newAttrs, function(k, v) {
                $e.attr(k, v);
              });
            }
          }
        }
      }
    };

    function _parse(e) {
      return A.$.map(A.$(e).data('bind').split(','), function(s) {
        var tmp = s.split(':'),
            k = A.$.trim(tmp[0]), v = A.$.trim(tmp[1]),
            b = bindingHandlers[k];
        if(!b) { return; }

        if(b.init) {
          b.init(e, v);
        }
        return function(data) {
          b.update(e, v, data);
        };
      });
    }

    return {
      init: function($root) {
        var ctx = { $root: $root, bindings: [] };
        $root.find('[data-bind]').each(function() {
          A.$.each(_parse(this), function(i, v) {
            ctx.bindings.push(v);
          });
        });
        return ctx;
      },
      update: function(ctx, data) {
        A.$.each(ctx.bindings, function(i, v) {
          v(data);
        });
      }
    };
  });



  P.when('A', 'gwAjax').register('gw-productdb', function(A, gwAjax) {
    var db = {};
    var ajaxUrl = {"params":{"swn":"productdb-ajax","ht":"6EA15C3DC4355BAFC38AD4C9C673A4961272F399","sa":"{}"},"url":"/gp/shogun/ajax.html","method":"get"};
    return {
      _add: function(data) {
        if(data.p) {
          A.$.each(data.p, function(i, p) {
            if(!p.asin) return;
            var entry = db[p.asin] || _new(p.asin);
            A.$.extend(entry, p, { loading: false, error: false });
            entry._trigger(p);
          });
        }
      },
      _ajax: _ajaxLoad,
      get: function(asin) {
        if(asin in db) {
          return db[asin];
        } else {
          return _new(asin);
        }
      }
    };

    function _new(asin) {

      var observers = [];

      db[asin] = {
        loading: true,
        pdb_observe: function(handler) {
          observers.push(handler);
        },
        pdb_unobserve: function(handler) {
          observers = A.$.grep(observers, function(v) {
            return v != handler;
          });
        },
        _trigger: function() {
          A.$.each(observers, function() {
            this.call(db[asin]);
          });
        }
      };

      return db[asin];
    }
    function _ajaxLoad(args, callbacks) {
      var rq = A.$.extend(true, {}, ajaxUrl, { 'params' :
        { 'sa': JSON.stringify(args), 'oe': '{"isDesktop":1,"isTablet":0,"isMobile":0}' } });
      if(window.ue_sid) {
        rq.url += '/' + window.ue_sid;
      }
      if(window.ue_id) {
        rq.params.rrid = window.ue_id;
      }

      return gwAjax(rq.url, {
        'method': rq.method,
        'params': rq.params,
        'success': callbacks['success'],
        'error': callbacks['error'],
        'id': 'gw-jslibs-' + callbacks.id
      });
    }
  });

  P.when('A').register('sg-jsutil', function(A) {
    var $ = A.$;

    return {
      safeCall: function(func, data) {
        if($.isFunction(func)) {
          return func(data);
        } else {
          return data;
        }
      },
      escapeRegExp: function(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }
    };
  });


  P.register('sg-media-builder', function() {
    return function(img) {
      var self = this,
          baseUrl = img.src,
          styleCodes = [];

      self.build = function() {
        var codeStr = styleCodes.join('_'),
            newUrl = baseUrl.replace(/\.([^.]+)$/, '\._' + codeStr + '_\.$1');

        return { 'src' : newUrl, 'alt' : img.alt };
      };

      self.autoCrop = function() {
        styleCodes.push('AC');
        return self;
      };

      self.scaleX = function(x) {
        styleCodes.push('SX' + x);
        return self;
      };

      self.scaleY = function(y) {
        styleCodes.push('SY' + y);
        return self;
      };

      self.upScaleX = function(x) {
        styleCodes.push('UX' + x);
        return self;
      };

      self.upScaleY = function(y) {
        styleCodes.push('UY' + y);
        return self;
      };

      self.scaleXY = function(x, y) {
        return self.upScaleX(x).scaleY(y);
      };
    };
  });
  
  P.when('A', 'sg-media-builder').register('gw-sims', function (A, mediaBuilder) {
 var $ = A.$;
 function Sims(binder) {
  var imagesToBeLoaded, sims, url,
      waitPeriod = 10000,
      loadCompleted = false,
      simsBlurBSize = 100000,
      simsSection = $('#sims-section'),
      simsBlur = simsSection.find('.sims-blur'),
      simsWrapper = simsSection.find('.sims-wrapper'),
      simsLoading = simsSection.find('.sims-loading'),
      simsDetails = simsSection.find('.sims-details'),
      gwAsinPopover = $('#gw-asin-popover');

  function adjustSimMargin() {
    if(loadCompleted) return;
    loadCompleted = true;
    var defaultPadding = 20;
    simsLoading.fadeOut(300, function() {
      simsDetails.show();
      simsWrapper.animate({ 'height':'100%'}, 300);
      var totalWidth = 0, visibleItemsWidth = 0, visibleItems = 0;
      var containerWidth = parseInt(simsDetails.css('width'));
      var simsImgLinks = simsDetails.find('.sims-img-link');
      simsImgLinks.each(function(index, item) {
        totalWidth += (item.clientWidth);
        if(containerWidth < totalWidth) {
          $(item).hide();
        } else {
          visibleItemsWidth = totalWidth;
          visibleItems += 1;
        }
      });
      var additionalSpace = containerWidth - visibleItemsWidth;
      if(additionalSpace > 0){
        var newPadding = Math.floor(defaultPadding + (additionalSpace/visibleItems) - 1);
        if(newPadding > defaultPadding) {
          simsImgLinks.css({
            'padding-right': newPadding/2 + 'px',
            'padding-left': newPadding/2 + 'px'
            });
        }
      }
      simsDetails.find('.sims-blur').each(function() {
        var blur = $(this);
        blur.css('background-size', simsBlurBSize*(simsBlur.width()/blur.width()) + '%');
      });
    });
  }

  function onSimImgLoad() {
    if(--imagesToBeLoaded == 0)
     adjustSimMargin();
  }

  function createSimImg(source) {
    var newSimImg = $('<img>');
    newSimImg.attr('src', source); 
    newSimImg.attr('class', 'sims-img');
    newSimImg.load(onSimImgLoad);
    return newSimImg;
  }

  function beforeUpdateBind(product, url) {
    if(product.loading) {
      if(typeof ue == 'object') {
        ue.count("freshPopOverLoading", (ue.count("freshPopOverLoading") || 0) + 1);
      }
      return product;
    }
    var media = new mediaBuilder(product.images[0]).autoCrop().scaleXY(500, 400).build(),
        override = {
      'url'   : url,
      'image' : media,
      'bgImage' : { style: "background-image:url(" + media.src + ")" },
      'actionUrl' : { action: '/gp/product/handle-buy-box/' + extractAfterRefPart(url)}
     };

    if(product.reviews) {
      override['reviews'] = $.extend({}, product.reviews, { url: url + '#customerReviews' });
    }
    return $.extend({}, product, override);
  }

  function addOverlay(imgLink) {
    var overlay = $('<div>'),
        blur = simsBlur.clone();
    overlay.addClass('sims-img-overlay');
    $(imgLink).append(overlay).append(blur);
  }

  function createSimLink(sim, isSelected) {
    var newSimLink = $('<a>'),
        border = $('<div>');
    newSimLink.attr('class', 'sims-img-link');
    border.addClass('sims-img-border');
    if(isSelected) newSimLink.addClass('selected');
    newSimLink.click(function() {
      if(typeof ue == 'object') {
        ue.count("freshPopOverSimsClick", (ue.count("freshPopOverSimsClick") || 0) + 1);
      }
      simsDetails.find('.sims-img-link').removeClass('selected');
      $(this).addClass('selected');
      binder.clear();
      binder.setAsin(sim['asin'], {
        'beforeUpdate': function(product){
         return beforeUpdateBind($.extend(true, {}, sim), sim['url']);
        }
      });
      simsDetails.find('.sims-blur').each(function() {
        var bi = 'background-image';
        $(this).css(bi, simsBlur.css(bi));
      }); 
    });
    return newSimLink.append(border);
  }

  function createSimContainer() {
    var newSimContainer = $('<div>');
    newSimContainer.attr('class', 'sims-img-container');
    addOverlay(newSimContainer);
    return newSimContainer;
  }

  function updateRefTags(){
    $.each(sims, function(index, sim){
      sim.url = sim.url.replace(/ref=gw_pdb_pdt-[\d]+/, extractAfterRefPart(url) + "&gw_sims-" + index);
    });
  }

  function extractAfterRefPart(url) {
    return url.substring(url.indexOf("\/ref\=")+1, url.length);
  }

  function populateSims() {
    loadCompleted = false;
    updateRefTags();
    var newSims = [];
    imagesToBeLoaded = sims.length > imagesToBeLoaded ? imagesToBeLoaded : sims.length;
    $(sims).each(function(index, sim) {
      sim.loading = false;
      var imageSrc = sim.images[0].src;
      if(imageSrc){
        var newSimImg = createSimImg(new mediaBuilder(sim.images[0]).autoCrop().scaleXY(130,100).build().src);
        var newSimContainer = createSimContainer();
        newSimContainer.append(newSimImg);
        var newSimLink = createSimLink(sim, index === 0);
        newSimLink.append(newSimContainer);
        newSims.push(newSimLink);
      }
      return index < (imagesToBeLoaded - 1);
    });
    imagesToBeLoaded = newSims.length;
    $(newSims).each(function(i, sim) {
      simsDetails.append(sim);
    });
    setTimeout(function(){
      adjustSimMargin();
    }, waitPeriod);
  }

  function closePopover() {
    P.when('gw-popover').execute(function(popover) {
      popover.hide();
    });
  }

  function setNoSimView() {
    simsLoading.fadeOut(300);
    simsBlur.add(simsWrapper).addClass('hidden');
    simsSection.bind('click', closePopover);
  }
  function resetSimView() {
    simsBlur.css('background-size', simsBlurBSize + '%'),
    simsWrapper.add(simsLoading).removeAttr('style');
    simsBlur.add(simsWrapper).removeClass('hidden');
    simsSection.unbind('click', closePopover);
  }

  function ajaxSuccess(data) {
    if(data && data.p){ 
      sims = $.merge(sims, data.p);
    }
    if(sims.length > 4) {
      populateSims();
    } else {
        if(typeof ue == 'object') {
          ue.count("simsLessThanThreshold", (ue.count("simsLessThanThreshold") || 0) + 1);
        }
        setNoSimView();
    }
  }

  return {
    'fetch': function(product, newUrl){
        simsDetails.empty();
        resetSimView();
        simsLoading.show();
        simsDetails.hide();
        url = newUrl;
        sims = [];
        imagesToBeLoaded = 8;
        sims.push(product);
        P.when('gw-productdb').execute(function(pdb) { pdb._ajax({
             'asins': [],
             'entityId': product.asin,
             'datasetId': 'purchase'
           }, { 
             'success': ajaxSuccess, 
             'error': setNoSimView,
             'id': 'sims-' + product.asin
           }
          );
        });   
        }
      };
    }
  return Sims;
}); 
  (function(h){h.execute(function(){h.when("A").register("gwAjax",function(g){return function(d,i){function c(e,b,c){typeof window.ue==="object"&&(i.errorCounter?window.ue.count(i.errorCounter,(window.ue.count(i.errCounter)||0)+1):window.ue.count("gwAjaxError",(window.ue.count("gwAjaxError")||0)+1));typeof window.ueLogError&&window.ueLogError({logLevel:"WARN",attribution:"gwAjax-"+(i.id||d),message:"gwAjax call failed "+(JSON&&JSON.stringify?JSON.stringify({url:d,"params-data":i.params||i.data}):"")});
typeof f==="function"&&f(e,b,c)}var i=g.copy(i),b=i.success,f=i.error;i.success=function(e,f,d){e.error?c(e,f,d):typeof b==="function"&&b(e,f,d)};i.error=c;i.data=i.params?i.params:i.data;typeof window.ue==="object"&&window.ue.count("gwAjaxCall",(window.ue.count("gwAjaxCall")||0)+1);return g.$.ajax(d,i)}});h.when("A").register("component-feed-carousel",function(g){var d=g.$,i=function(c,b){this.init(c,b)};i.prototype={init:function(c,b){g.$("html").hasClass("a-touch")&&c.addClass("feed-carousel-touch");
this.adjustMarginOnChange=!0;this.defaultCssRightMargin=null;this.minItems=b||10;this.$carousel=c;this.touch=this.$carousel.hasClass("feed-carousel-touch");this.$shelf=this.$carousel.find(".feed-carousel-shelf");this.$viewport=this.$carousel.find(".feed-carousel-viewport");this.$spinner=this.$carousel.find(".spinner");this.$left=d(".feed-carousel-control.feed-left",c);this.$right=d(".feed-carousel-control.feed-right",c);this.$buttons=d(".feed-carousel-control",c);this.$thumb=d(".feed-scrollbar-thumb",
c);this.shelfLeft=-1*parseInt(this.$shelf.css("left"),10);this.calcWidth=d("html").hasClass("a-lt-ie9");this.noOpacity=d("html").hasClass("a-lt-ie9");this.bindEvents();this.$carousel.data("Carousel",this);this.$carousel.trigger("change")},bindEvents:function(){function c(e){return g.capabilities.pointerPrefix&&d.inArray(e.originalEvent.pointerType,[2,"touch"])>-1||g.capabilities.actionMode==="touch"}var b=this,f=d("body");b.$carousel.change(function(){b.updateSpinner();b.updateShelf();b.updateControls();
if(b.defaultCssRightMargin===null&&b.$shelf.children("li").first())b.defaultCssRightMargin=parseInt(b.$shelf.children("li").first().css("margin-right"),10);b.adjustMarginOnChange&&b.adjustCardMargin()});b.$left.click(function(e){e.preventDefault();b.changePage(-1)});b.$right.click(function(e){e.preventDefault();b.changePage(1)});d(".product-image",b.$shelf).one("sload",function(){b.$carousel.trigger("change")});var e;d(window).resize(function(){clearTimeout(e);e=setTimeout(function(){var e=b.getDimensions(),
e=Math.max(Math.min(e.shelfLeft,e.maxLeft),0);b.moveShelf(e)},100)});b.$thumb.mousedown(function(e){var c=e.clientX;e.which===1&&(e.preventDefault(),b.$carousel.addClass("scrolling"),f.bind("mousemove.feed-carousel",function(e){var f=b.getDimensions(),f=Math.max(Math.min(f.shelfLeft+1/f.pageRatio*(e.clientX-c),f.maxLeft),0);c=e.clientX;b.moveShelf(f)}),d(document).bind("selectstart.feed-carousel",function(){return!1}))});f.add(window).mouseup(function(){b.$carousel.removeClass("scrolling");b.$carousel.hasClass("hovering")||
b.hideControls();f.unbind("mousemove.feed-carousel");d(document).unbind("selectstart.feed-carousel")});b.$carousel.hover(function(){b.$carousel.addClass("hovering");clearTimeout(b.hoverTimer);b.hoverTimer=setTimeout(function(){b.$carousel.hasClass("hovering")&&!b.$carousel.hasClass("touching")?b.showControls():b.$carousel.removeClass("touching")},300)},function(){b.$carousel.removeClass("hovering touching");clearTimeout(b.hoverTimer);if(!b.$carousel.hasClass("scrolling"))b.hoverTimer=setTimeout(function(){b.$carousel.hasClass("hovering")||
b.hideControls()},600)});b.$carousel.bind(g.action.start,function(e){if(c(e))b.$carousel.addClass("touching"),clearTimeout(b.touchTimer),b.touchTimer=setTimeout(function(){b.$carousel.removeClass("touching")},5E3)});b.$carousel.bind(g.action.end,function(e){c(e)&&(b.$carousel.removeClass("touching"),clearTimeout(b.touchTimer),clearTimeout(b.hoverTimer))});b.$viewport.scroll(function(){b.shelfLeft=b.$viewport.scrollLeft();b.updateControls()})},getDimensions:function(){var c=this.$shelf.width(),b=this.shelfLeft,
f=this.$carousel.width();return{pageWidth:f,shelfWidth:c,shelfLeft:b,pageRatio:f/c,leftRatio:b/c,maxLeft:c-f}},updateShelf:function(){var c=0;this.calcWidth&&(this.$shelf.children().each(function(){c+=d(this).outerWidth(!0)}),this.$shelf.width(c));this.touch&&this.$carousel.not(".fresh-shoveler-tablet-app .feed-carousel").height(this.$shelf.outerHeight(!0))},updateSpinner:function(){this.size()<this.minItems?this.$spinner.show():this.$spinner.hide()},updateControls:function(){this.updateArrows();
this.updateScrollThumb()},showControls:function(c){this.$thumb.add(this.$buttons).stop(!0,!0).fadeIn({duration:300,complete:c,queue:!1})},hideControls:function(c){var b=this.$thumb;if(!this.$carousel.hasClass("first-carousel")||this.touch)b=b.add(this.$buttons);b.stop(!0,!0).fadeOut({duration:300,complete:c,queue:!1})},appendCards:function(c){this.$shelf.append(c);this.$carousel.trigger("change")},updateArrows:function(){var c=this,b=c.getDimensions();d.each([{$e:c.$left,enabled:b.shelfLeft>0},{$e:c.$right,
enabled:b.shelfLeft<b.maxLeft}],function(b,e){var d=e.$e;e.enabled?d.removeClass("feed-control-disabled"):d.addClass("feed-control-disabled");c.noOpacity&&(e.enabled?d.css("opacity","1"):d.css("opacity","0.5"))})},updateScrollThumb:function(){var c=this.getDimensions(),b=c.leftRatio*c.pageWidth;this.$thumb.width(Math.min(c.pageRatio*c.pageWidth,c.pageWidth)).each(function(){g.animate(d(this),{left:b},0)})},changePage:function(c){var b=this.getDimensions(),f=this.alignWithItem(b.shelfLeft+c*b.pageWidth),
f=Math.min(c<0?f.right:f.left,b.maxLeft);b.shelfLeft===f?(this.bounce(this.$shelf,-30*c),this.bounce(this.$thumb,6*c)):this.moveShelf(f,400)},moveShelf:function(c,b){var f=this,b=b||0;f.shelfLeft=c;if(f.touch)f.$viewport.animate({scrollLeft:c},b,"swing",function(){f.updateArrows()});else{var e=f.getDimensions(),e=c/e.shelfWidth*e.pageWidth;g.animate(f.$shelf,{left:-c},b,"cubic-bezier(0.455, 0.03, 0.515, 0.955)",function(){f.updateArrows()});g.animate(f.$thumb,{left:e},b,"cubic-bezier(0.455, 0.03, 0.515, 0.955)",
function(){f.updateScrollThumb()})}},getItems:function(){return this.$shelf.find(".feed-carousel-card")},size:function(){return this.getItems().length},alignWithItem:function(c){if(c<0)return{left:0,right:0};var b=this,f=b.getItems(),e=f.map(function(){var e=b.cardPosition(d(this));if(c>=e.left&&c<=e.right)return e}).get(0);return e?e:b.cardPosition(f.last())},cardPosition:function(c){var b=c.position().left,c=b+c.outerWidth(!0);return{left:b,right:c}},bounce:function(c,b){function f(b){var c={};
c[e.touch?"left":"marginLeft"]=b;return c}var e=this;c.each(function(){var e=d(this);g.animate(e,f(b),400,"cubic-bezier(0.175, 0.885, 0.32, 1.275)",function(){g.animate(e,f(0),100)})})},setCardMargin:function(c){this.$shelf.children("li").first()&&this.$shelf.children("li").first().css("margin-right")!==c+"px"&&(this.$shelf.children("li").css("margin-right",c+"px"),this.updateShelf())},adjustCardMargin:function(c){c=c===void 0||c===null?this.defaultCssRightMargin:c;this.setCardMargin(c);var b=this.getDimensions(),
b=b.maxLeft<0?Math.ceil(-b.maxLeft/this.size()):c;this.setCardMargin(b<c?c:b)}};return{createCarousel:function(c,b){d(c).each(function(c,e){var d=g.$(e);new i(d,b)})}}});h.when("A").register("component-sequential-images",function(g){var d=g.$;return{loadImages:function(g){for(var c=function(e,b){d(e).show().bind("load error",function(c){d(e).unbind(c);d(b).trigger("sload")}).each(function(){e.complete&&d(e).triggerHandler("load")})},b=2,f=g.length;b<=f;b++)(function(e,b){d(e).bind("sload",function(f){f.target===
this&&(d(e).unbind(f),c(this,b))})})(g[b-1],g[b]);c(g[0],g[1])}}})})})(function(){var h=window.AmazonUIPageJS||P,g=h.attributeErrors;return g?g("AmazonGatewayAuiAssets"):h}());

