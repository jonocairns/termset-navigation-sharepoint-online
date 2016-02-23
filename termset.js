/*!
 * Termset utilities
 */
 
var Hcf = Hcf || {};
Hcf.Util = Hcf.Util || {};
Hcf.Util.Termset = Hcf.Util.Termset || {};
 
(function(module) {
 
    /**
     * Returns a termset, based on ID
     *
     * @param {string} id - Termset ID
     * @param {object} callback - Callback function to call upon completion and pass termset into
     */
    module.getTermSet = function (id, callback) {
        SP.SOD.loadMultiple(['sp.js'], function () {
            // Make sure taxonomy library is registered
            SP.SOD.registerSod('sp.taxonomy.js', SP.Utilities.Utility.getLayoutsPageUrl('sp.taxonomy.js'));
 
            SP.SOD.loadMultiple(['sp.taxonomy.js'], function () {
                var ctx = SP.ClientContext.get_current(),
                    taxonomySession = SP.Taxonomy.TaxonomySession.getTaxonomySession(ctx),
                    termStore = taxonomySession.getDefaultSiteCollectionTermStore(),
                    termSet = termStore.getTermSet(id),
                    terms = termSet.getAllTerms();
 
                ctx.load(terms);
 
                ctx.executeQueryAsync(Function.createDelegate(this, function (sender, args) {
                    callback(terms);
                }),
 
                Function.createDelegate(this, function (sender, args) { }));
            });
        });
    };
 
 
    /**
     * Returns an array object of terms as a tree
     *
     * @param {string} id - Termset ID
     * @param {object} callback - Callback function to call upon completion and pass termset into
     */
    module.getTermSetAsTree = function (id, callback, cachePreload) {
        cachePreload();
        module.getTermSet(id, function (terms) {
            var termsEnumerator = terms.getEnumerator(),
                tree = {
                    term: terms,
                    children: []
                };
 
            // Loop through each term
            while (termsEnumerator.moveNext()) {
                var currentTerm = termsEnumerator.get_current();
                var currentTermPath = currentTerm.get_pathOfTerm().split(';');
                var children = tree.children;
 
                // Loop through each part of the path
                for (var i = 0; i < currentTermPath.length; i++) {
                    var foundNode = false;
 
                    for (var j = 0; j < children.length; j++) {
                        if (children[j].name === currentTermPath[i]) {
                            foundNode = true;
                            break;
                        }
                    }
 
                    // Select the node, otherwise create a new one
                    var term = foundNode ? children[j] : { name: currentTermPath[i], children: [] };
 
                    // If we're a child element, add the term properties
                    if (i === currentTermPath.length - 1) {
                        term.term = currentTerm;
                        term.title = currentTerm.get_name();
                        term.guid = currentTerm.get_id().toString();
                        term.link = currentTerm.get_localCustomProperties()['_Sys_Nav_SimpleLinkUrl'];
                    }
 
                    // If the node did exist, let's look there next iteration
                    if (foundNode) {
                        children = term.children;
                    }
                    // If the segment of path does not exist, create it
                    else {
                        children.push(term);
 
                        // Reset the children pointer to add there next iteration
                        if (i !== currentTermPath.length - 1) {
                            children = term.children;
                        }
                    }
                }
            }
 
            tree = module.sortTermsFromTree(tree);
 
            callback(tree);
        });
    };
 
 
    /**
     * Sort children array of a term tree by a sort order
     *
     * @param {obj} tree The term tree
     * @return {obj} A sorted term tree
     */
    module.sortTermsFromTree = function (tree) {
        // Check to see if the get_customSortOrder function is defined. If the term is actually a term collection,
        // there is nothing to sort.
        if (tree.children.length && tree.term.get_customSortOrder) {
            var sortOrder = null;
 
            if (tree.term.get_customSortOrder()) {
                sortOrder = tree.term.get_customSortOrder();
            }
 
            // If not null, the custom sort order is a string of GUIDs, delimited by a :
            if (sortOrder) {
                sortOrder = sortOrder.split(':');
 
                tree.children.sort(function (a, b) {
                    var indexA = sortOrder.indexOf(a.guid);
                    var indexB = sortOrder.indexOf(b.guid);
 
                    if (indexA > indexB) {
                        return 1;
                    } else if (indexA < indexB) {
                        return -1;
                    }
 
                    return 0;
                });
            }
            // If null, terms are just sorted alphabetically
            else {
                tree.children.sort(function (a, b) {
                    if (a.title > b.title) {
                        return 1;
                    } else if (a.title < b.title) {
                        return -1;
                    }
 
                    return 0;
                });
            }
        }
 
        for (var i = 0; i < tree.children.length; i++) {
            tree.children[i] = module.sortTermsFromTree(tree.children[i]);
        }
 
        return tree;
    };

    module.renderTerm = function renderTerm(term) {
        var downArrowImage = ''; // check a img here for a down arrow
        var downArrow = term.children && term.children.length && term.children.length > 0 ? downArraowImage: '';
        var html = '<li><a title="' + term.title + '" href=\'' + term.link + '\'>' + term.title + downArrow + '</a>';

        if (term.children && term.children.length) {
            html += '<ul>';
 
            for (var i = 0; i < term.children.length; i++) {
                html += renderTerm(term.children[i]);
            }
 
            html += '</ul>';
        }
 
        return html + '</li>';
    };

    module.init = function (id, callback, cachePreload) {
        // Only vars you need to change here and the image above
        var termSetId = 'd233e2de-6082-4e14-8756-5d546bcc58c3';
        var targetIdToPutNavInside = '#zz11_TopNavigationMenu';
        var localStorageKey = 'global-nav-termset-' + termSetId;

        module.getTermSetAsTree(termSetId, function (terms) {
            var html = '';
     
            // Kick off the term rendering
            for (var i = 0; i < terms.children.length; i++) {
                html += module.renderTerm(terms.children[i]);
            }
            var htmlToAppend = '<div id="primary_nav_wrap"><ul>' + html + '</ul></div>';
            localStorage.setItem(localStorageKey, htmlToAppend);
            $('#primary_nav_wrap').remove();
            $(targetIdToPutNavInside).append(htmlToAppend);
        }, function() {
                var navHtml = localStorage.getItem(localStorageKey);
                if(navHtml) {
                    $('#primary_nav_wrap').remove();
                    $(targetIdToPutNavInside).append(navHtml);
                }
            });
    };
 
})(Hcf.Util.Termset);