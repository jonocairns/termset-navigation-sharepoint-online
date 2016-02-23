$(function() {
	SP.SOD.executeFunc('SP.js', 'SP.ClientContext', function() {
		// ensure termset.js is included before here
        Hcf.Util.Termset.init();
    });
 });