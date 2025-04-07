/******/ "use strict";

/**
 * Copyright (c) 2013-2023 Amuse Labs Pvt Ltd
 * This file is used by clients to programmatically embed iframe puzzles in their pages.
 *
 * To embed a puzzle in a page, the client page needs to
 * 1. Add the CryptoJS library in the page using the following script inclusion tag under the head section of the page.
 * <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js"></script>
 * [ Note that if the client page is already using CryptoJS, then this step can be skipped.
 * Also, if the client page is using a different implementation of hash function , then this step can be skipped.]
 * 2. Add the following script inclusion tag under the head section of the page.
 * <script id="pm-script" src="<servername>/<appname>/js/pmEmbed-min.js"></script>
 * or
 * Copy the content of this file and paste it under script tag in the page.
 * 3. Add a div tag with class as 'pm-embed-iframe' in the body section of the page where the puzzle needs to be embedded.
 * <div class="pm-embed-iframe" data-id="my-puzzle_20230803" data-set="pmm" data-height="700px" data-mobileMargin="0px"></div>
 * The div tag can have the following data attributes.
 * data-id: This is the id of the puzzle to be embedded. This is optional. If not specified, the puzzle picker will be displayed.
 * data-set: This is the set of the puzzle to be embedded. This is mandatory.
 * data-height: This is the height of the iframe for desktop devices.
 * data-mobileMargin: This represents the height reduction of the iframe for mobile devices mainly to support sticky headers.
 * data-loggedin-uid-cookie: This is the name of the cookie which stores the uid of the user when user is logged in to the publisher's website. This is optional.
 * data-loggedout-uid-cookie: This is the name of the cookie which stores the uid of the user when user is not logged in to the publisher's website. This is optional.
 * data-uid: This is the uid of the user. This is optional. If not specified, the uid is generated by the getUID method.
 * data-embedParams: This is a string of the parameters which should be passed to iframe url when instantiating the iframe. It is of the form "key1=val1&key2=val2.."
 * 4. Customize the PM_Config object and message handlers to suit your needs. See comments in the code for more details.
 */
var PM_EMBED_DIV_CLASS = 'pm-embed-div'; // class name used to identify the container div under which the iframe will be embedded.
var PM_EMBED_DIV_SELECTOR = '.pm-embed-div'; // corresponding selector for the above class.
var PM_IFRAME_CLASS = 'pm-iframe'; // Class name assigned to the instantiated iframe.
var PM_IFRAME_CLASS_SELECTOR = '.pm-iframe'; // Class name assigned to the instantiated iframe.
var PM_UID_COOKIE_NAME = 'loggedout_uid'; // Name of the cookie which stores the uid of the user if none (loggedin-uid-cookie or loggedout-uid-cookie) is being specified by the client.
var SCRIPT_NAME = 'puzzleme-embed.js'; // Name of the bundle in which this script gets bundled.
/**
 ************************************ CUSTOMIZABLE SECTION: Functions to override for custom functionalities ************************************
 */
/**
 * This object should be filled with the configuration values specific to the client.
 */
var PM_Config = {
    /**
     * Customization 1: This variable should point to the basepath of amuselabs.com app which will serve the puzzles.
     * This is mandatory.
     */
    PM_BasePath: "",
    /**
     * Customization 2: This function should be overridden to return uid for tracking the user's progress.
     * This is optional. If not specified, user's progress will not be tracked across devices.
     * The boiler plate code for this method is provided for the following scenario,
     *  - The page has a login mechanism and the logged in user's identification is stored in a cookie identified by LOGGED_IN_UID_COOKIE_NAME.
     *  - The page has a user's tracking mechanism using cookies when user is *not* logged in and the identification is stored in a cookie LOGGED_OUT_UID_COOKIE_NAME.
     *  - This code first checks if it can find the uid in the cookie identified by LOGGED_IN_UID_COOKIE_NAME. If it finds it then it returns the hash of the uid.
     * - If this cookie is not available then it checks if it can find the uid in the cookie identified by LOGGED_OUT_UID_COOKIE_NAME. If it finds it then it returns the hash of the uid.
     * - If no cookie is found in above two variables the a new uid is generated and stored in the cookie identified by PM_UID_COOKIE_NAME variable.
     */
    getUID: function (LOGGED_IN_UID_COOKIE_NAME, LOGGED_OUT_UID_COOKIE_NAME) {
        /**
         * Default implementation to generate a unique id for the user.
         */
        function genUUID() {
            var dt = new Date().getTime();
            var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = (dt + Math.random() * 16) % 16 | 0;
                dt = Math.floor(dt / 16);
                return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
            });
            return uuid;
        }
        /**
         * This function reads the cookie with the given name and returns the value.
         */
        function readCookie(name) {
            var nameEQ = name + "=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = trim(ca[i]);
                if (c.indexOf(nameEQ) == 0)
                    return c.substring(nameEQ.length, c.length);
            }
            return null;
        }
        /*
        /**
         * This function sets the cookie with the given name and value.
         */
        function setCookie(name, value, days) {
            var d = new Date();
            d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "expires=" + d.toUTCString();
            document.cookie = name + "=" + value + ";" + expires + ";path=/";
        }
        /**
         * This function hashes the given string. override it with your own hashing function.
         * Default method provided here uses the hash function from the  CryptoJS library.
         * For this to work the CryptoJS library should be included in the page with the following script tag before including this script.
         * <script src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js" integrity="sha512-E8QSvWZ0eCLGk4km3hxSsNmGWbLtSCSUcewDQPQWZF6pEU8GlT8a5fF32wOl1i8ftdMhssTrF/OhyGWwonTcXA==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
         */
        function hash(str) {
            if (typeof CryptoJS === 'undefined')
                return str; // return original string if CryptoJS is not available.
            else if (CryptoJS.SHA256)
                return CryptoJS.SHA256(str).toString();
            else
                return str; // return original string if CryptoJS.SHA256 is not available.
        }
        /****************** Actual functionality of getUID starts from here ******************/
        // read cookie for logged in user if cookie is defined.
        if (LOGGED_IN_UID_COOKIE_NAME != null) {
            var uid_1 = readCookie(LOGGED_IN_UID_COOKIE_NAME);
            if (uid_1)
                return hash(uid_1);
        }
        if (LOGGED_OUT_UID_COOKIE_NAME != null) {
            var uid_2 = readCookie(LOGGED_OUT_UID_COOKIE_NAME);
            if (uid_2)
                return hash(uid_2);
        }
        // Control reaches here when either the cookie names are not defined or the cookies are not set.
        // In this case check if the cookie is already present for PM_UID_COOKIE_NAME. If not then generate a new cookie and set it else return the value of the cookie.
        var uid = readCookie(PM_UID_COOKIE_NAME);
        if (uid)
            return hash(uid);
        else {
            // generate a new uid
            var uuid = genUUID();
            // set cookie
            if (uuid != null && uuid != "")
                setCookie(PM_UID_COOKIE_NAME, uuid, 365);
            return hash(uuid);
        }
    }
};
/**
 * Customization 3: Custom message handler function templates to handle the messages sent by iframe.
 * If the host page wants to handle these messages then these functions should be overridden.
 * By default following two cases have already been taken care of in these handlers.
 * Case 1. Resizing of the iframe based on the height of the puzzle/picker when picker/puzzle display is complete.
 *  - onPickerDisplayOrResize handler
 *  - onPuzzleDisplayOrResize handler
 * Case 2. Scroll puzzle to top when the puzzle is click.
 *  - onPuzzleClick handler
 * Any other functionality can be implemented by overriding the below functions.
 * In case the host page doesn't want to perform any action on the message then these functions can be removed
 */
/**
 * This function is called when the picker is loaded in an iframe.
 * The passed data has the following structure
 * {"src": "picker", "message": "Picker shown"}
 */
function onPickerLoad(data) { }
/**
 * This function is called when the puzzles in the picker are fully displayed.
 * It contains the height of the iFrame. This can be used to set the iFrame height to display the
 * entire list of puzzles on the screen without having an iFrame scroll.
 * The passed data has the following structure
 * {"src": "picker", "message": "Picker shown", "frameHeight":741}
 * @param data
 */
function onPickerDisplayOrResize(data) {
}
/**
 * This function is called when a puzzle is loaded. It contains detailed metadata about the puzzle.
 * This event can be used to update the puzzle information on the parent page.
 * The passed data has the following structure
 * {"src":"crossword", "id":"amuselabs-expert_20210503_0300", "series":"daily-crossword-expert",
 * "puzzleType":"crossword","width":15, "height":15, "title":"Daily Crossword", "author":"Amuse Labs",
 * "authorURL":"", "tn_url":"", "copyright":"© Amuse Labs 2022", "attributions":"", "puzzle_instructions":"",
 * "progress":"puzzleLoaded"}
 * @param data
 */
function onPuzzleLoad(data) { }
/**
 * This function is called when a) puzzle is completely rendered on the screen, and b) every time the puzzle is resized.
 * The passed data has the following structure
 * {"src":"crossword", "id":"daily-crossword_20230131_0300", "series":"daily-crossword","puzzleType":"crossword",
 * "frameHeight":702, "frameWidth":1207}
 * @param data
 */
function onPuzzleDisplayOrResize(data) {
}
/**
 * This function is called when user clicks or taps on any part of the puzzle. The page can scroll to bring the puzzle in view
 * The passed data has the following structure
 * {"src":"crossword", "id":"daily-crossword_20230131_0300", "series":"daily-crossword","puzzleType":"crossword",
 * "type":event, "gridOffset":0}
 * @param data
 */
function onPuzzleClick(data) {
    // scroll the page to put puzzle on view.
    scrollPageToGetView(data);
}
/**
 * This function is called when the puzzle has been fully solved. This message contains information
 * such as score and time taken to solve the puzzle.
 * The passed data has the following structure
 * {"src":"crossword", "id":"amuselabs-expert_20210503_0300", "series":"daily-crossword-expert",
 * "puzzleType":"crossword","progress":"puzzleCompleted", "timeTaken":8, "score":0}
 * @param data
 */
function onPuzzleComplete(data) { }
//*********************************** NON CUSTOMIZABLE SECTION: *********************************************************************************
/**
 * This function executes when the page is loaded. It looks for all div tags with class as 'pm-embed-iframe' and creates an iframe for each of them.
 * The information about the puzzle to be embedded is passed as data attributes of the div tag. For example a div tag will look as following,
 * <div class="pm-embed" data-id="my-puzzle_20230803" data-set="pmm" data-height="700px" data-mobileMargin="10px"></div>
 * This method will iterate over the dom of the page to look for such div tags and create an iframe for each of them.
 */
function embedGame() {
    console.log("=========Attention==========\n\nThis script has been modified, and is being intercepted and served by Sherlock. Created by Yash and Saanvi.\\n\n=======Message over========")
    // Construct iframe url based on parameters.
    function getIframeURL(iframeInfo) {
        var serverBaseName = getServerBaseName(true);
        if (serverBaseName == null || serverBaseName === '') {
            return null;
        }
        // pageName, puzzleEmbedParams and puzzleSet all three should be non-null when control reaches here. We ensure this in the calling function itself.
        // if set is null then we don't proceed. pageName is set to picker by default. puzzleEmbedParams is set to 'embed=js' by default.
        // puzzleEmbedParams can have multiple params separated by & so each of them should be encoded separately.
        var iframeURL = serverBaseName + '/' + iframeInfo.pageName + '?' + '&set=' + fixedEncodeURIComponent(iframeInfo.puzzleSet);
        // Now add the puzzleEmbedParams to the iframe url.
        new URLSearchParams(iframeInfo.puzzleEmbedParams).forEach(function (value, key) {
            iframeURL += '&' + key + '=' + fixedEncodeURIComponent(value);
        });
        // Now add other parameters which were passed explicity either by data-attribute in the div tag or by the parent page url.
        if (iframeInfo.pickerStyle != null && iframeInfo.pickerStyle !== '' && iframeInfo.pickerStyle !== '0')
            iframeURL += '&style=' + fixedEncodeURIComponent(iframeInfo.pickerStyle);
        if (iframeInfo.puzzleId != null && iframeInfo.puzzleId !== '')
            iframeURL += '&id=' + fixedEncodeURIComponent(iframeInfo.puzzleId);
        if (iframeInfo.src != null && iframeInfo.src !== '')
            iframeURL += '&src=' + fixedEncodeURIComponent(iframeInfo.src);
        if (iframeInfo.uid !== null && iframeInfo.uid !== '')
            iframeURL += '&uid=' + fixedEncodeURIComponent(iframeInfo.uid);
        if (iframeInfo.puzzlePlayId !== null && iframeInfo.puzzlePlayId !== '')
            iframeURL += '&playId=' + fixedEncodeURIComponent(iframeInfo.puzzlePlayId);
        // if parentPagePath is not null then add it to the iframe url as src parameter. This is required for the iframe to
        // construct social play URL correctly.
        if (iframeInfo.parentPagePath !== null && iframeInfo.parentPagePath !== '')
            iframeURL += '&src=' + fixedEncodeURIComponent(iframeInfo.parentPagePath);
        if (iframeInfo.limit !== null && iframeInfo.limit !== '')
            iframeURL += '&limit=' + fixedEncodeURIComponent(iframeInfo.limit);
        // append all the remaining params from parentPage url and their values to the iframe URL
        // Note that if any of these params in topURL were extracted to define puzzleId, src, uid and puzzlePlayId fields then they were already removed from the parentPageParams
        // to avoid them adding again in the url. This was done in getConfigurationParams by the calling function.
        for (var param in iframeInfo.parentPageParams) {
            if (parentPageParams.hasOwnProperty(param)) {
                iframeURL += '&' + param + '=' + fixedEncodeURIComponent(iframeInfo.parentPageParams[param]);
            }
        }
        return iframeURL;
    }
    // *************************** Function embedGame starts from here ******************************/
    // Get top url of the page.
    var parentPageBasePath = window.location.href;
    // Get the path of the parent page.
    var parentPagePath;
    // if parentPageBasePath has query params then remove them.
    if (parentPageBasePath.indexOf('?') !== -1) {
        parentPagePath = trim(parentPageBasePath.substring(0, parentPageBasePath.indexOf('?')));
    }
    else
        parentPagePath = trim(parentPageBasePath);
    // Get the query params of the parent page.
    var parentPageParams = extractParams(parentPageBasePath);
    // Now iterate over all div tags in the page which have class as 'pm-embed-iframe'.
    // we will only insert the unique style tag for each div that redefines the css variables desktopHeight and mobileMargin
    // create iframe src url by reading the properties from theses div tags and query params.
    // Create iframe element and append it to the div tag.
    var divs = document.getElementsByClassName(PM_EMBED_DIV_CLASS);
    for (var i = 0; i < divs.length; i++) {
        var parentDiv = divs[i];
        // Check if the div has an iframe child with class "pm-iframe"
        var iframediv = parentDiv.querySelector("iframe".concat(PM_IFRAME_CLASS_SELECTOR));
        if (iframediv) { // implies that an iframe has already been added as this div child so simply continue.
            continue;
        }
        // A race condition may exist between checking for an existing iframe and inserting a new one, potentially resulting in multiple iframes within a single div.
        // To handle this 1. Introduce a new data attribute: data-processing
        // Set 2. data-processing="true" when processing begins on a div
        // 3. Remove data-processing attribute when processing completes
        // Though we can still have race condition between checking of iframe and setting of data-processing attribute but 
        // from our experiments we saw that JS thread doesn't yield the control between these two actions.
        // However on browserstack (iphone 14) we saw thread yielding the control when inserting iframe in the dom. At that point another execution of the embedGame method
        // ended up inserting two iframes within the same div.
        {
            // Step 1 (Preventing race condition on ifram insertion). Check if the div is already being processed
            if (parentDiv.getAttribute('data-processing') === 'true') {
                continue; // Skip this div if it's already being processed
            }
            // Step 2 (Preventing race condition on iframe insertion). Mark the div as being processed
            parentDiv.setAttribute('data-processing', 'true');
        }
        var tmpParentPageParams = JSON.parse(JSON.stringify(parentPageParams)); // create deep copy
        // First check if the params from the tmpParentPageParams should flow into this particular div's url or not.
        // This is the case when a page has more than 1 divs embedded  on it and a deep link is being opened. If the params in the deep link
        // get passed to each of the puzzlme-embed div then those divs where the deep link related puzzle (id or set) was not present will show 404 page.
        // To avoid this we want to pass the deep link params from the parentPageURL to only those div where it makes sense. (which means where
        // the set attribute of the parentPageParam matches with the set attribute specified in the div - if at all the set attribute is specified
        // in the top param)
        if (tmpParentPageParams['set'] && parentDiv.hasAttribute('data-set')) {
            var divSet = parentDiv.getAttribute('data-set');
            var topURLSet = tmpParentPageParams['set'];
            if (divSet != topURLSet) {
                // empty tmpParentPageParams so that no attribute from topURL is passed to the div for constructing iframe url.
                tmpParentPageParams = {};
            }
        }
        {
            // constructing the style for this div if the information is available in the div's data attributes
            // First create a unique class name for this div
            var uniqueClassName = "".concat(PM_EMBED_DIV_CLASS, "-").concat(i);
            parentDiv.classList.add(uniqueClassName);
            // Read custom values from data attributes. 
            var customDesktopHeight = parentDiv.getAttribute('data-height');
            var customMobileMargin = parentDiv.getAttribute('data-mobileMargin');
            // Only proceed with style creation if either customDesktopHeight or customMobileMargin is present
            if (customDesktopHeight || customMobileMargin) {
                // Prepare the style content
                var specificStyleContent = "";
                // Add desktop height if specified
                if (customDesktopHeight) {
                    specificStyleContent += "\n                    .".concat(uniqueClassName, " {\n                        height: ").concat(customDesktopHeight, "; \n                    }");
                }
                // Add mobile styles if margin is specified
                if (customMobileMargin) {
                    specificStyleContent += "\n                @media only screen and (max-width: 480px) {\n                    .".concat(uniqueClassName, " {\n                        height: calc(100vh - ").concat(customMobileMargin, "); \n                    }\n                    }");
                }
                // Add custom styles for this div to the document head
                var specificStyleTag = document.createElement('style');
                specificStyleTag.textContent = specificStyleContent;
                document.head.appendChild(specificStyleTag);
            }
        }
        var puzzleId = getConfigParam('id', parentDiv, tmpParentPageParams);
        var puzzleSet = getConfigParam('set', parentDiv, tmpParentPageParams);
        if (puzzleSet == null) {
            // we can't construct the iframe url so continue with log message in console.
            if (console)
                console.log('PuzzleMe: Unable to construct iframe url because set was not specified. Please check the configuration parameters.');
            continue;
        }
        var iframeTitle = getConfigParam('iframetitle', parentDiv, tmpParentPageParams);
        var iframeName = getConfigParam('iframename', parentDiv, tmpParentPageParams);
        var pickerStyle = getConfigParam('style', parentDiv, tmpParentPageParams);
        var puzzlePlayId = getConfigParam('playId', parentDiv, tmpParentPageParams);
        var src = getConfigParam('src', parentDiv, tmpParentPageParams);
        var puzzleEmbedParams = getConfigParam('embedParams', parentDiv, tmpParentPageParams, 'embed=js');
        var Userid = getConfigParam('uid', parentDiv, tmpParentPageParams);
        var limit = getConfigParam('limit', parentDiv, tmpParentPageParams);
        // If userid is not specified either as data attribute in the div tag or as a query param in the parent page url then
        // check if the cookie name is being given in the div tag. If yes then read the cookie names (logged in and logged out cookies) and
        // pass them to getUID method which reads the cookies and returns the uid (if present) else generates a new uid and stores it in a cookie.
        if (Userid == null) {
            var loggedInCookie = getConfigParam('loggedin-uid-cookie', parentDiv, tmpParentPageParams);
            var loggedOutCookie = getConfigParam('loggedout-uid-cookie', parentDiv, tmpParentPageParams);
            if (PM_Config.getUID != null && typeof PM_Config.getUID === 'function')
                Userid = PM_Config.getUID(loggedInCookie, loggedOutCookie);
        }
        // Create a new iframe element.
        var iframe = document.createElement('iframe');
        // Add the iframe to this div.
        parentDiv.appendChild(iframe);
        // getting params for attribution text from parentDiv
        var attributionKeyWord = getConfigParam('keyword', parentDiv, tmpParentPageParams);
        var attributionLink = getConfigParam('link', parentDiv, tmpParentPageParams);
        if (attributionKeyWord && attributionLink) {
            // if the attribution params have been specified, add the text below the iframe
            // Create the attribution div
            var $attributionDiv = document.createElement("div");
            // Set the styles
            // using inline styles as css can't be injected to parent site
            $attributionDiv.style.fontFamily = "Sans-Serif";
            $attributionDiv.style.fontSize = "12px";
            $attributionDiv.style.color = "#666666";
            $attributionDiv.style.position = "absolute";
            $attributionDiv.style.top = "100%";
            $attributionDiv.style.left = "50%";
            $attributionDiv.style.transform = "translate(-50%, 0)";
            $attributionDiv.style.paddingTop = "5px";
            $attributionDiv.style.width = "100%";
            // getting author from data attributes, or "" if null
            var attributionAuthor = getConfigParam('author', parentDiv, tmpParentPageParams);
            attributionAuthor = attributionAuthor ? attributionAuthor : "";
            // Set the inner HTML
            $attributionDiv.innerHTML = getAttributionText(attributionKeyWord, attributionLink, attributionAuthor);
            parentDiv.appendChild($attributionDiv);
        }
        // set the name of the iframe as set.
        iframe.setAttribute('name', puzzleSet);
        // set the class name of this iframe as PM_IFRAME_CLASS. So that this iframe can be identified later and
        // we can change its attributes like height, width etc.
        iframe.setAttribute('class', PM_IFRAME_CLASS);
        // set the style and other attributes of the iframe.
        {
            var fixedStyle = "border:none; height: 100%; width: 100% !important; position: static; display: block !important; margin: 0 !important;"; // This was taken from the existing embed code url from preview and publish page.
            iframe.setAttribute('allow', 'web-share; fullscreen');
            iframe.setAttribute('style', fixedStyle);
        }
        // set width as 100% of parent container and height as 700px unless specified otherwise using the data-height attribute of the pm-embed-iframe div
        {
            iframe.width = '100%';
            if (!parentDiv.getAttribute('data-height'))
                iframe.height = '700px';
        }
        // Add the aria-label attribute to the iframe
        iframe.setAttribute('aria-label', 'Puzzle Me Game');
        var pageName = 'date-picker';
        // set Pagename for URL
        {
            var puzzleType = getConfigParam('puzzleType', parentDiv, tmpParentPageParams);
            var puzzlePage = getConfigParam('page', parentDiv, tmpParentPageParams);
            if (puzzlePage != null) {
                // Give preference to puzzlePage field irrespeective of puzzleType field being null or not.
                pageName = puzzlePage;
            }
            else if (puzzleType != null) {
                pageName = puzzleType;
            }
            // if both are null then take the default value as 'date-picker'
        }
        // construct the iframe url.
        var iframeURL = getIframeURL({ pageName: pageName, puzzleId: puzzleId, puzzleSet: puzzleSet, pickerStyle: pickerStyle,
            puzzleEmbedParams: puzzleEmbedParams, parentPageParams: tmpParentPageParams,
            src: src, uid: Userid, puzzlePlayId: puzzlePlayId, parentPagePath: parentPagePath, limit: limit
        });
        if (iframeURL == null) {
            if (console)
                console.log("Unable to construct the iframe URL for loading puzzle/picker. Please contact support@amuselabs.com for help.");
        }
        // Set title and name of iframe and load the iframe with iframeURL
        if (iframe && iframeURL) {
            if (iframeTitle != null && iframeTitle !== '') {
                iframe.setAttribute('title', iframeTitle);
            }
            if (iframeName != null && iframeName !== '') {
                iframe.setAttribute('name', iframeName);
            }
            if (-1 == navigator.userAgent.indexOf("MSIE")) {
                iframe.setAttribute('src', iframeURL);
            }
            else {
                iframe.setAttribute('location', iframeURL);
            }
        }
        // Step 3 (Preventing race condition on iframe insertion). Remove data-processing attribute when processing completes
        parentDiv.removeAttribute('data-processing');
    }
}
// ****************************** Helper functions ****************************
/**
 * This function parses the parent page URL and returns the query params as a map.
 * @param parentPageURL
 */
function extractParams(parentPageURL) {
    // Extract the query params from the URL
    var url = new URL(parentPageURL);
    var params = new URLSearchParams(url.search);
    var paramsMap = {};
    params.forEach(function (value, key) {
        paramsMap[key] = value;
    });
    // Return the query params as a map
    return paramsMap;
}
/**
 * Helper functions to trim a string and encode string for URL
 */
var trim = function (s) {
    if (typeof (s) !== 'string')
        return s;
    var c;
    // trim leading
    while (true) {
        if (s.length === 0)
            break;
        c = s.charAt(0);
        if (c !== '\n' && c !== '\t' && c !== ' ')
            break;
        s = s.substring(1);
    }
    // trim trailing
    while (true) {
        if (s.length === 0)
            break;
        c = s.charAt(s.length - 1);
        if (c !== '\n' && c !== '\t' && c !== ' ')
            break;
        s = s.substring(0, s.length - 1);
    }
    return s;
};
/**
 * For encoding URI component
 */
function fixedEncodeURIComponent(str) {
    return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
        return '%' + c.charCodeAt(0).toString(16);
    });
}
/**
 * Adjust the picker height to fit the iframe content
 */
function updateHeight(data) {
    if ('frameHeight' in data) {
        // set height of all the pm puzzle iframes (having PM_EMBED_IFRAME_CLASS class) present on this page.
        document.querySelectorAll(PM_IFRAME_CLASS_SELECTOR).forEach(function (iframe) {
            // we already have a style attribute. We only want to change the height attribute inside it.
            if (iframe instanceof HTMLIFrameElement) {
                iframe.height = data.frameHeight + 'px;';
            }
        });
    }
}
/**
 * Scroll page to get the puzzle in view
 */
function scrollPageToGetView(data) {
    var offset = (data.gridOffset) ? data.gridOffset : 0; // Scroll the page to get the crossword in view
    var puzzleContainer = document.querySelector(PM_EMBED_DIV_SELECTOR);
    var scrollTop = 0;
    if (puzzleContainer) {
        var rect = puzzleContainer.getBoundingClientRect();
        var containerOffset = {
            top: rect.top + window.scrollY,
            left: rect.left + window.scrollX,
        };
    }
}
/**
 * get Configuration parameters (set, id, pageName) from the div tag or from the parent page URL. In case it is present in both the places
 * then the one in the div tag takes precedence.
 * @param paramName
 * @param divTag
 * @param parentPageParams
 * returns the approrpiate field value else null if not found in either of the places. It also removes the paramName from parentPageParams if it is present there.
 */
function getConfigParam(paramName, divTag, parentPageParams, defaultVal) {
    if (divTag.hasAttribute('data-' + paramName)) {
        var val = divTag.getAttribute('data-' + paramName);
        // remove if it is present in parentPageParams.
        delete parentPageParams[paramName];
        return val;
    }
    else if (parentPageParams[paramName]) {
        var val = parentPageParams[paramName];
        delete parentPageParams[paramName];
        return val;
    }
    else
        return defaultVal ? defaultVal : null;
}
/**
 * Get the base name of the server from where the iframe will fetch the puzzle. This is computed based on the location of src tag of this script.
 */
function getServerBaseName(withApp) {
    // get the url of the this script to find out the server name from where it was loaded.
    function getScriptURL() {
        var script = document.currentScript || document.querySelector("script[src*=\"".concat(SCRIPT_NAME, "\"]"));
        // Check if the script element was found
        if (script && script instanceof HTMLScriptElement) {
            return script.src;
        }
        else {
            return '';
        }
    }
    var src = '';
    if (PM_Config.PM_BasePath == "") {
        // if we couldn't find the PM_BasePath variable (because of the loading delay of this script) then try to extract the base path from the url of this script.
        var scriptURL = getScriptURL();
        if (scriptURL == '' && console) {
            console.log("Unable to find the hostname and app name of amuselabs.com which will serve the puzzle. Contact support@amuselabs.com");
            return '';
        }
        else {
            // the src is of the form https://amuselabs.com/pmm/js/puzzlme-embed.js. From this we need to extract the base url upto /pmm/.
            var url_1 = new URL(scriptURL);
            // Extract the base URL path up to the first '/'
            var pathSegments = url_1.pathname.split('/');
            src = "".concat(url_1.origin, "/").concat(pathSegments[1]);
        }
    }
    else
        src = PM_Config.PM_BasePath;
    // here src is of the form 'https://staging.amuselabs.com/pmm'
    // We need to extract base URL and the app name from this URL. For this create URL object from this string and extract the protocol, host and path name fields.
    var url = new URL(src);
    if (withApp) {
        // url.pathname is everything followed by staging.amuselabs.com. To get the app name we split it by '/' and take the second element.
        return url.protocol + "//" + url.host + "/" + url.pathname.split('/')[1];
    }
    else
        return url.protocol + "//" + url.host;
}
/**
 * Get Text for the attribution div
 * Has to be kept in sync with publish.ts (can't be moved to Utils as puzzleme-embed does not import other scripts)
 * @param keyword - keyword to be used, varies for each game
 * @param link - link to game homepage on AL.com
 * @param author - if author available for the puzzle, adding to text
 * @returns Compiled string to be used
 */
var getAttributionText = function (keyword, link, author) {
    var attributionText = "Created";
    // if author is available, adding author name
    if (author != "") {
        attributionText += " by " + author;
    }
    // adding keyword within an anchor tag to specified link
    // using inline styles as css can't be injected to parent site
    attributionText += " using <a href=\"".concat(link, "\" target=\"_blank\" style=\"color: #666666;\">").concat(keyword, "</a> by Amuse Labs");
    return attributionText;
};
// ************* PuzzleMe iframe message communication setup ****************************
/**
 * iframes sends messages on following events depending upon picker page or puzzle page
 *    1) From picker page in an iframe
 *     - On picker load
 *     - On picker display
 *   2) From puzzle page in an iframe
 *     - On puzzle load
 *     - On puzzle display and resize
 *     - On puzzle click
 *     - On puzzle completion
 */
/**
 * message handler for receiving messages from the iframes
 */
function receiveMessage(event) {
    var PUZZLE_HOST = getServerBaseName(false); //the site name where puzzles are hosted, e.g. cdnx.amuselabs.com
    if (PUZZLE_HOST == null) // don't listen to messages unless the source is same as the host that is serving the puzzles.
        return;
    try {
        if (PUZZLE_HOST === event.origin) {
            var origin = event.origin;
            var data = void 0;
            if (event.data) {
                data = JSON.parse(event.data);
            }
            if (data) {
                if (data.src === 'picker') { // implies that the message is from picker page inside iframe
                    if ('frameHeight' in data) { // implies that the puzzles in the picker are fully displayed.
                        if (onPickerDisplayOrResize)
                            onPickerDisplayOrResize(data); // forward the data to the passed handler if provided by the user.
                    }
                    else { // implies that the picker is loaded
                        if (onPickerLoad) // forward to the passed handler if provided by the user.
                            onPickerLoad(data);
                    }
                }
                else if (data.src === 'crossword') { // implies that the message is from puzzle page inside iframe
                    if ('frameHeight' in data) { // implies that the puzzle is completely rendered on the screen
                        if (onPuzzleDisplayOrResize) // forward to the passed handler if provided by the user.
                            onPuzzleDisplayOrResize(data);
                    }
                    if ('progress' in data) {
                        if (data.progress === 'puzzleLoaded') { // implies that the puzzle is loaded
                            if (onPuzzleLoad) // forward to the passed handler if provided by the user.
                                onPuzzleLoad(data);
                        }
                        else if (data.progress === 'puzzleCompleted') { // implies that the puzzles is completed
                            if (onPuzzleComplete) // forward to the passed handler if provided by the user.
                                onPuzzleComplete(data);
                        }
                    }
                    if ('type' in data && data.type === 'event') { // implies that the puzzle is clicked
                        if (onPuzzleClick) // forward to the passed handler if provided by the user.
                            onPuzzleClick(data);
                    }
                }
            }
        }
    }
    catch (error) {
        // commenting out the following log message as there are some messages where data doesn't get stringified and therefore JSON.parse
        // fails for these messages. In future we want to remove this discrepency.
        /*if (console)
            console.log('PuzzleMe embed error: ' + error);*/
    }
}
;
/**
 * ************** Top level statements start from here *******************************************
 */
/**
 * add event listener for receiving messages from iframes
 * **/
window.addEventListener("message", receiveMessage, !1);
/**
 * Trigger the loading of the puzzle.
 */
window.addEventListener('load', function () {
    embedGame();
});
/**
 * Ideally we shouldn't wait for all the scripts on the page to load before triggering embedGame() method. We can trigger as soon as the DOM is ready with all HTML
 * elements (on DomContentLoaded event). However, this assumes that puzzleme-embed-div gets inserted in the dom explicitly through HTML. If this assumption doesn't hold and the integration
 * inserts this div programmatically at some later time then calling embedGame() earlier will not insert iframe in the div as the div won't be present at the point in time.
 * To give more control to the user we now allow the integration to explicitly make call to embedGame when the div is known to be present surely. But we still need
 * to coninue supporting automatic invocation of embedGame method as existing integrations will continue to rely on this. We would like to trigger iframe embedding on DOMContentLoaded
 * event as well so that existing integrations which insert pm-embed-div directly in the page see faster rendering of iframe without waiting for all other scripts on that page to finish loading.
 */
window.addEventListener('DOMContentLoaded', function () {
    embedGame();
});

