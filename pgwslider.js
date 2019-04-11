/**
 * PgwSlider - Version 2.3
 *
 * Copyright 2014, Jonathan M. Piat
 * http://pgwjs.com - http://pagawa.com
 * 
 * Released under the GNU GPLv3 license - http://opensource.org/licenses/gpl-3.0
 */
;(function($){
    $.fn.pgwSlider = function(options) {

        var defaults = {
            mainClassName : 'pgwSlider',
            displayControls : false,
            touchControls : true,
            beforeSlide : null,
            afterSlide : null
        };

        if (this.length == 0) {
            return this;
        } else if(this.length > 1) {
            this.each(function() {
                $(this).pgwSlider(options);
            });
            return this;
        }

        var pgwSlider = this;
        pgwSlider.plugin = this;
        pgwSlider.data = [];
        pgwSlider.config = {};
        pgwSlider.currentSlide = 0;
        pgwSlider.slideCount = 0;
        pgwSlider.resizeEvent = null;
        pgwSlider.intervalEvent = null;
        pgwSlider.touchFirstPosition = null;
        pgwSlider.transitionInProgress = false;
        pgwSlider.window = $(window);

        pgwSlider.pgwList = null;
        
        // Init
        var init = function() {

            // Merge user options with the default configuration
            pgwSlider.config = $.extend({}, defaults, options);

            // Setup
            setup();

            return true;
        };

        // Get element
        var getElement = function(obj) {
            var element = {};

            // Get link
            var elementLink = obj.find('a').attr('href');
            if ((typeof elementLink != 'undefined') && (elementLink != '')) {
                element.link = elementLink;
                var elementLinkTarget = obj.find('a').attr('target');
                if ((typeof elementLinkTarget != 'undefined') && (elementLinkTarget != '')) {
                    element.linkTarget = elementLinkTarget;
                }
            }

            // Get image 
            var elementThumbnail = obj.find('img').attr('src');
            if ((typeof elementThumbnail != 'undefined') && (elementThumbnail != '')) {
                element.thumbnail = elementThumbnail;
            }

            var elementImage = obj.find('img').attr('data-large-src');
            if ((typeof elementImage != 'undefined') && (elementImage != '')) {
                element.image = elementImage;
            }

            // Get title 
            var elementSpan = obj.find('figcaption').text();
            if ((typeof elementSpan != 'undefined') && (elementSpan != '') && (elementSpan != null)) {
                element.title = elementSpan;
            } else {
                var elementTitle = obj.find('img').attr('alt');
                if ((typeof elementTitle != 'undefined') && (elementTitle != '')) {
                    element.title = elementTitle;
                }
            }

            // Get description
            var elementDescription = obj.find('img').attr('data-description');
            if ((typeof elementDescription != 'undefined') && (elementDescription != '')) {
                element.description = elementDescription;
            }

            return element;
        };

        // Update the current height
        var updateHeight = function(element) {

            var height = element.height();
            
            // Prevents multiple calculations in a short time
            clearTimeout(pgwSlider.resizeEvent);
            pgwSlider.resizeEvent = setTimeout(function() {

                // Adjust right list
                var elementHeight = ((height - ((pgwSlider.slideCount - 1) * 6)) / pgwSlider.slideCount);
                var elementWidth =  Math.min((100 / pgwSlider.slideCount), 33);                
                
                pgwSlider.pgwList.css({ width: elementWidth + '%' });
                pgwSlider.pgwList.css('height', elementHeight);
                
                var imgHeight = element.find('img').height();                
                pgwSlider.plugin.find('.ps-prev').css('top', imgHeight * 0.4);
                pgwSlider.plugin.find('.ps-next').css('top', imgHeight * 0.4);

            }, 100);

            return true;
        };

        /*
        // Set size class
        var setSizeClass = function() {
            
            pgwSlider.plugin.addClass('narrow');
            if (pgwSlider.plugin.width() <= 480) {
                pgwSlider.plugin.addClass('narrow').removeClass('wide');
            } else {
                pgwSlider.plugin.addClass('wide').removeClass('narrow');
            }

            return true;
        };
        */
        
        // Setup
        var setup = function() {

            // Create container
            pgwSlider.plugin.removeClass(pgwSlider.config.mainClassName).addClass('ps-list');
            pgwSlider.plugin.wrap('<div class="' + pgwSlider.config.mainClassName + '"></div>');
            pgwSlider.plugin = pgwSlider.plugin.parent();
            
            var pgwUl = $('<ul></ul>'), pgwCurrent = $('<div class="ps-current"></div>').append(pgwUl);
            
            pgwSlider.plugin.prepend(pgwCurrent);
            
            pgwSlider.pgwList = pgwSlider.plugin.find('.ps-list > li');            
            pgwSlider.slideCount = pgwSlider.pgwList.length;
            if (pgwSlider.slideCount == 0) {
                console.log('PgwSlider - No slider item has been found');
                return false;
            }

            // Add controls
            if (pgwSlider.config.displayControls && pgwSlider.slideCount > 1) {
                pgwCurrent.prepend('<span class="ps-prev"><span class="ps-prevIcon"></span></span>');
                pgwCurrent.append('<span class="ps-next"><span class="ps-nextIcon"></span></span>');
                pgwCurrent.find('.ps-prev').click(function() {
                    pgwSlider.previousSlide();
                });
                pgwCurrent.find('.ps-next').click(function() {
                    pgwSlider.nextSlide();
                });
            }

            // Get slider elements
            var elementId = 1;
            pgwSlider.pgwList.each(function() {
                var element = getElement($(this));
                element.id = elementId;
                pgwSlider.data.push(element);

                $(this).addClass('elt_' + element.id);
                

                // Set element in the current list
                var currentElement = $('<li class="elt_' + elementId + '"></li>');
                
                currentElement.html($(this).html());

                pgwUl.append(currentElement);

                $(this).click(function(event) {
                        event.preventDefault();
                        displayElement(element.id);
                });
                
                elementId++;
            });

            
            // Display the first element
            displayElement(1);

            // Set the first height
            pgwCurrent.find('ul > li.elt_1 img').on('load', function() {
                //setSizeClass();

                updateHeight(pgwSlider.plugin.find('.ps-current > ul > li.elt_1'));

                pgwSlider.window.resize(function() {
                    updateHeight(pgwSlider.plugin.find('.ps-current > ul > li.elt_' + pgwSlider.currentSlide));
                });
            });

            // Touch controls for current image
            if (pgwSlider.config.touchControls && pgwSlider.slideCount > 1) {

                pgwCurrent.on('touchstart', function(e) {
                    try {
                        if (e.touches[0].clientX && pgwSlider.touchFirstPosition == null) {
                            pgwSlider.touchFirstPosition = e.touches[0].clientX;
                        }
                    } catch(e) {
                        pgwSlider.touchFirstPosition = null;
                    }
                });

                pgwCurrent.on('touchmove', function(e) {
                    try {
                        if (e.touches[0].clientX && pgwSlider.touchFirstPosition != null) {
                            if (e.touches[0].clientX > (pgwSlider.touchFirstPosition + 50)) {
                                pgwSlider.touchFirstPosition = null;
                                pgwSlider.previousSlide();
                            } else if (e.touches[0].clientX < (pgwSlider.touchFirstPosition - 50)) {
                                pgwSlider.touchFirstPosition = null;
                                pgwSlider.nextSlide();
                            }
                        }
                    } catch(e) {
                        pgwSlider.touchFirstPosition = null;
                    }
                });

                pgwCurrent.on('touchend', function(e) {
                    pgwSlider.touchFirstPosition = null;
                });
            }

            return true;
        };

        // Fade an element
        var fadeElement = function(element) {
            var elementContainer = pgwSlider.plugin.find('.ps-current > ul');

            // Update list items
            pgwSlider.pgwList.removeClass('active');
            pgwSlider.pgwList.filter('.elt_' + element.id).addClass('active');

            elementContainer.find('li').not('.elt_' + pgwSlider.currentSlide).not('.elt_' + element.id).each(function(){
                if (typeof $(this).stop == 'function') {
                    $(this).stop();
                }
                $(this).removeClass('active');
            });

            // Current element
            if (pgwSlider.currentSlide > 0) {
                var currentElement = elementContainer.find('.elt_' + pgwSlider.currentSlide);

                
                if (typeof currentElement.stop == 'function') {
                    currentElement.stop();
                }

                currentElement.removeClass('active');
                
            }

            // Update current id
            pgwSlider.currentSlide = element.id;

            // Next element
            var nextElement = elementContainer.find('.elt_' + element.id);

            if (typeof nextElement.stop == 'function') {
                nextElement.stop();
            }
            
            nextElement.addClass('active');
            
            // positon controls
            if (pgwSlider.config.displayControls) {
                var imgHeight = pgwSlider.plugin.find('.ps-current li.active img').height();
                pgwSlider.plugin.find('.ps-prev').css('top', imgHeight * 0.4);
                pgwSlider.plugin.find('.ps-next').css('top', imgHeight * 0.4);
                //pgwSlider.plugin.find('.ps-current > .ps-prev, .ps-current > .ps-next').removeClass('fade');
            }
            
            // After slide
            if (typeof pgwSlider.config.afterSlide == 'function') {
                pgwSlider.config.afterSlide(element.id);
            }  
            
            return true;
        }

    

        // Display the current element
        var displayElement = function(elementId, apiController, direction) {

            if (elementId == pgwSlider.currentSlide) {
                return false;
            }

            var element = pgwSlider.data[elementId - 1];

            if (typeof element == 'undefined') {
                throw new Error('PgwSlider - The element ' + elementId + ' is undefined');
                return false;
            }

            if (typeof direction == 'undefined') {
                direction = 'left';
            }

            // Before slide
            if (typeof pgwSlider.config.beforeSlide == 'function') {
                pgwSlider.config.beforeSlide(elementId);
            }

            //pgwSlider.plugin.find('.ps-prev, .ps-next').addClass('fade');

            // Transition effect
            fadeElement(element);
            
            
            return true;
        };

        // Stop auto slide
        pgwSlider.stopSlide = function() {
            clearInterval(pgwSlider.intervalEvent);
            return true;
        };

        // Get current slide
        pgwSlider.getCurrentSlide = function() {
            return pgwSlider.currentSlide;
        };

        // Get slide count
        pgwSlider.getSlideCount = function() {
            return pgwSlider.slideCount;
        };

        // Display slide
        pgwSlider.displaySlide = function(itemId) {
            displayElement(itemId, true);
            return true;
        };

        // Next slide
        pgwSlider.nextSlide = function() {
            if (pgwSlider.currentSlide + 1 <= pgwSlider.slideCount) {
                var nextItem = pgwSlider.currentSlide + 1;
            } else {
                var nextItem = 1;
            }
            displayElement(nextItem, true, 'left');
            return true;
        };

        // Previous slide
        pgwSlider.previousSlide = function() {
            if (pgwSlider.currentSlide - 1 >= 1) {
                var previousItem = pgwSlider.currentSlide - 1;
            } else {
                var previousItem = pgwSlider.slideCount;
            }
            displayElement(previousItem, true, 'right');
            return true;
        };

        // Destroy slider
        pgwSlider.destroy = function(soft) {

            if (typeof soft != 'undefined') {
                pgwSlider.pgwList.each(function() {
                    $(this).attr('style', null).removeClass().unbind('click').unbind('mouseenter');
                    $(this).find('img').attr('style', null);
                });

                pgwSlider.plugin.find('.ps-list').addClass(pgwSlider.config.mainClassName).removeClass('ps-list');
                pgwSlider.plugin.find('.ps-current').unwrap().remove();
                pgwSlider.hide();

            } else {
                pgwSlider.parent().remove();
            }

            pgwSlider.plugin = null;
            pgwSlider.data = [];
            pgwSlider.config = {};
            pgwSlider.currentSlide = 0;
            pgwSlider.slideCount = 0;
            pgwSlider.resizeEvent = null;
            pgwSlider.window = null;

            return true;
        };

        // Reload slider
        pgwSlider.reload = function(newOptions) {
            pgwSlider.destroy(true);

            pgwSlider = this;
            pgwSlider.plugin = this;
            pgwSlider.window = $(window);
            pgwSlider.plugin.show();

            // Merge new options with the default configuration
            pgwSlider.config = $.extend({}, defaults, newOptions);

            // Setup
            setup();

            return true;
        };

        // Slider initialization
        init();

        return this;
    }
})(window.Zepto || window.jQuery);
