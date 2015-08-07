P.when('gw-popover').execute(function(gwPopover) {
	gwPopover.show.apply(gwPopover, [JSON.parse(box.attr("data-sgproduct")).asin, couldBeLink.attr("href")]);
});