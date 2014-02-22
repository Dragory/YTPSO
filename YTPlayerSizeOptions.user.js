// ==UserScript==
// @name           YouTube Player Size Options
// @namespace      http://www.mivir.fi/
// @description    Adds three options for YouTube's player size: 360p (S), 480p (M) and 720p (L).
// @include        http://*.youtube.com/watch*
// @include        http://youtube.com/watch*
// @include        https://*.youtube.com/watch*
// @include        https://youtube.com/watch*
// @version        2.5.0
// ==/UserScript==

(function() {
	"use strict";

	/**
	 * The function we will add to the end of <body>.
	 *
	 * @param  {Object}  window  The window object
	 */
	var YTPSO_OnPage = function(window) {
		var console = window.console || {log: function() {}};

		/**
		 * HELPERS / UTILITY FUNCTIONS
		 */

		// Thanks to jQuery for reference for hasClass and removeClass.
		// You guys are geniuses.
		var hasClass = function(elem, theClass)
		{
			if ( ! elem) return;

			var classes = (" " + elem.className + " ")
				.replace(/[\t\r\n]+/g, " ");

			return classes.indexOf(" " + theClass + " ") >= 0;
		};

		var removeClass = function(elem, theClass)
		{
			if ( ! elem) return;

			var classes = (" " + elem.className + " ")
				.replace(/[\t\r\n]/g, " ") // Remove excess whitespace
				.replace(" " + theClass + " ", " "); // Remove the class

			elem.className = classes.trim();
		};

		// http://stackoverflow.com/a/196038
		var addClass = function(elem, theClass)
		{
			if ( ! elem) return;
			if ( ! hasClass(elem, theClass)) elem.className += " " + theClass;
		};

		/**
		 * The YouTube Player Size Options function/"class"
		 */

		var YTPSO = function() {
			this.playerSizes = {
				//  x     y
				1: [640,  390],
				2: [854,  510],
				3: [1280, 750]
			};

			// Store the previously added class (e.g. ytpso-1280x720) so we
			// can remove it by name later on.
			this.previousYTPSOClass = '';

			// Were we previously on a wide player?
			this.previousWide = false;

			// The element to place our/YTPSO's classes in
			this.classRoot = document.body;

			// These will be set along with initialization
			this.container = null;
			this.player = null;
			this.legacyPlayer = null;
			this.buttonContainer = null;

			// The player width at which the player is not
			// narrow anymore.
			this.narrowLimit = 640;
		};

		/**
		 * Saves the player's size identifier or index in localStorage.
		 *
		 * @param   {Integer}    index  The index for the size (see this.playerSizes)
		 */
		YTPSO.prototype.saveSize = function(index)
		{
			localStorage.setItem('YTPSO-sizeId', index);
		};

		/**
		 * Loads a saved size index stored in localStorage.
		 *
		 * @return  {Mixed}  The index (int) when it's found and in this.playerSizes,
		 *                   null if it's not found or not in this.playerSizes.
		 */
		YTPSO.prototype.loadSize = function()
		{
			var savedId = localStorage.getItem('YTPSO-sizeId');

			if (savedId && this.playerSizes[savedId]) return savedId;
			else return null;
		};
		
		/**
		 * Tries to attach initialization to the event when
		 * YouTube adds a new player on the size. This also
		 * happens with the initial load. Falls back to normal
		 * initialization if that fails.
		 */
		YTPSO.prototype.handleInitializationTiming = function()
		{
			var self = this;

			// Create our custom styles for the player
			this.addStyles();

			// Make sure we reinitialize YTPSO when YouTube loads
			// a new video via AJAX. This doesn't apply
			// to the stylesheets which stay even when navigating.
			var hasInitialized = false;

			var attemptInitializing = function() {
				if (hasInitialized) {
					return true;
				}

				self.initialize();
				hasInitialized = true;
			};

			try {
				attemptInitializing();

				// Reset the initialization on AJAX navigation
				window.yt.pubsub.instance_.subscribe('navigate', function() {
					hasInitialized = false;
					return true;
				});

				window.yt.pubsub.instance_.subscribe('player-added', function() {
					attemptInitializing();
					return true;
				});

				window.yt.pubsub.instance_.subscribe('init-watch', function() {
					attemptInitializing();
					return true;
				});
			} catch (e) {
				console.log('[YTPSO] Could not subscribe to the player-added or init-watch event. Initializing only on initial page load.');
				self.initialize();
			}
		};

		/**
		 * Initializes YTPSO.
		 */
		YTPSO.prototype.initialize = function()
		{
			// The container for the player, player buttons (underneath it), comments, etc.
			// Some of YouTube's own classes (such as watch-wide) are placed in this element.
			this.container = document.getElementById('watch7-container');

			// The watch-medium class also gets added to #player and/or #player-legacy
			this.player = document.getElementById('player');
			this.legacyPlayer = document.getElementById('player-legacy');

			// The container for the buttons underneath the player
			this.buttonContainer = document.getElementById('watch7-sentiment-actions');

			addClass(this.container, 'ytpso');

			this.setInitialSize();
			this.addButtons();
		};

		/**
		 * Checks if we have a saved player size and uses that
		 * if it's found.
		 */
		YTPSO.prototype.setInitialSize = function()
		{
			// If we have a saved player size, use that
			var size = this.loadSize();
			if (size) this.setPlayerSize(this.playerSizes[size]);
		};

		/**
		 * Calculates a new position for an annotation.
		 * Not used yet, gotta look more into how the annotations are handled in the HTML5 player.
		 *
		 * @param  {String}  originalPlayerName  Class name of the player, e.g. watch-medium or watch-large
		 * @param  {Int}     newWidth            The "new" (set by YTPSO) width of the player
		 * @param  {Int}     newHeight           The "new" (set by YTPSO) height of the player
		 * @param  {Int}     annotationX         The current X coordinate of the annotation
		 * @param  {Int}     annotationY         The current Y coordinate of the annotation
		 *
		 * @return  {Array}  An array with the new X at [0] and new Y at [1]
		 */
		YTPSO.prototype.calculateAnnotationPosition = function(originalPlayerName, newWidth, newHeight, annotationX, annotationY)
		{
			var originalPlayerWidth,
				originalPlayerHeight,
				newX,
				newY;

			switch (originalPlayerName) {
				case 'watch-medium':
					originalPlayerWidth = 854;
					originalPlayerHeight = 480;
					break;

				case 'watch-large':
					originalPlayerWidth = 1280;
					originalPlayerHeight = 720;
					break;

				default:
					originalPlayerWidth = 640;
					originalPlayerHeight = 360;
					break;
			}

			newX = (newWidth / originalPlayerWidth * annotationX);
			newY = (newHeight / originalPlayerHeight * annotationY);

			return [newX, newY];
		};

		/**
		 * Builds our stylesheet and adds it on the page.
		 */
		YTPSO.prototype.addStyles = function()
		{
			var styles = '';

			/**
			 * Size-specific styles
			 */
			
			for (var i in this.playerSizes) {
				var playerWidth = this.playerSizes[i][0],
					playerHeight = this.playerSizes[i][1],
					videoWidth = playerWidth,
					videoHeight = playerHeight - 30, // 30 i.e. the video controls' height
					isNarrow = (playerWidth <= this.narrowLimit),
					ytpsoSelector = '.ytpso-' + playerWidth + 'x' + playerHeight;

				// The player's container's width. This is the part that's centered.
				// The small player isn't centered by itself, as the sidebar
				// also takes some space on the side.
				var playerContainerWidth = Math.max(1040, playerWidth);

				// Page and player container in Feather
				var featherPageContainerWidth = Math.max(960, playerWidth),
					featherPlayerContainerWidth = playerWidth;

				styles += ytpsoSelector + ' #ct {';
					styles += 'width: ' + featherPageContainerWidth + 'px;';
				styles += '}';

				styles += ytpsoSelector + ' #lc {';
					styles += 'width: ' + featherPlayerContainerWidth + 'px;';
				styles += '}';

				// Player container width
				styles += ytpsoSelector + ' #player,';                  // Default
				styles += ytpsoSelector + ' .cardified-page #player {'; // "Cardified" theme
					styles += 'width: ' + playerContainerWidth + 'px !important;';
					styles += 'max-width: ' + playerContainerWidth + 'px !important;';
				styles += '}';

				// Player width/height
				styles += ytpsoSelector + ' #player-api,';         // Default
				styles += ytpsoSelector + ' #player-api-legacy,';  // "Legacy"
				styles += ytpsoSelector + ' #p {';                 // Feather
					styles += 'width: ' + playerWidth + 'px;';
					styles += 'height: ' + playerHeight + 'px;';
				styles += '}';

				// HTML5 video's annotations etc.
				styles += ytpsoSelector + ' .html5-video-content {';
					styles += 'width: ' + videoWidth + 'px !important;';
					styles += 'height: ' + videoHeight + 'px !important;';
				styles += '}';
			}

			/**
			 * The HTML5 video element that for some reason now has inline styles for width and height(?)
			 */

			styles += '.html5-main-video {';
				styles += 'width: 100% !important;';
				styles += 'height: 100% !important;';
				styles += 'left: 0 !important;';
				styles += 'top: 0 !important;';
			styles += '}';

			/**
			 * YTPSO buttons in Feather
			 */
			
			styles += '#vo #ytpso-buttons {';
				styles += 'margin-left: 10px;';
			styles += '}';

			styles += '#vo #ytpso-buttons .b {';
				styles += 'margin: 0 8px 0 0;';
			styles += '}';

			/**
			 * Create the style element and append it to head
			 */

			var styleElement = document.createElement('style');
			styleElement.type = 'text/css';
			styleElement.innerHTML = styles;

			document.head.appendChild(styleElement);
		};

		/**
		 * Adds the video player size control buttons underneath the player.
		 * Determines whether to add default or feather buttons.
		 */
		YTPSO.prototype.addButtons = function()
		{
			// Are we on the default YT page or on the feather version?
			var featherButtonContainer = document.getElementById('vo');

			if (featherButtonContainer !== null) { // Feather
				this.addFeatherButtons();
			} else { // Default
				this.addDefaultButtons();
			}
		};

		/**
		 * Adds the size control buttons on the default YT page (non-feather).
		 */
		YTPSO.prototype.addDefaultButtons = function() {
			var self = this;
			var buttonContainer = this.buttonContainer;

			var ytpsoButtonContainer = document.createElement('span');
			ytpsoButtonContainer.id = 'ytpso-buttons';

			var createButton = function(label, size) {
				var but = document.createElement('button');
				but.className = 'yt-uix-button yt-uix-button-text';
				but.innerHTML = label;

				but.onclick = function() {
					self.setPlayerSize(self.playerSizes[size]);
					self.saveSize(size);
				};

				return but;
			};

			var but_s = createButton('S', 1);
			var but_m = createButton('M', 2);
			var but_l = createButton('L', 3);

			ytpsoButtonContainer.appendChild(but_s);
			ytpsoButtonContainer.appendChild(but_m);
			ytpsoButtonContainer.appendChild(but_l);

			buttonContainer.appendChild(ytpsoButtonContainer);
		};

		/**
		 * Adds the size control buttons on the YT Feather page.
		 */
		YTPSO.prototype.addFeatherButtons = function() {
			var self = this;
			var featherButtonContainer = document.getElementById('vo');

			var ytpsoButtonContainer = document.createElement('span');
			ytpsoButtonContainer.id = 'ytpso-buttons';

			var createButton = function(label, size) {
				var but = document.createElement('button');
				but.className = 'b';
				but.innerHTML = label;

				but.onclick = function() {
					self.setPlayerSize(self.playerSizes[size]);
					self.saveSize(size);
				};

				return but;
			};

			var but_s = createButton('S', 1);
			var but_m = createButton('M', 2);
			var but_l = createButton('L', 3);

			ytpsoButtonContainer.appendChild(but_s);
			ytpsoButtonContainer.appendChild(but_m);
			ytpsoButtonContainer.appendChild(but_l);

			featherButtonContainer.appendChild(ytpsoButtonContainer);
		};

		/**
		 * Changes the player's size to the given dimensions.
		 *
		 * @param   {Array}  size  The desired player size with X at index 0 and Y at index 1.
		 */
		YTPSO.prototype.setPlayerSize = function(size)
		{
			if ( ! size instanceof Array || size.length != 2) return;

			var width = size[0],
				height = size[1],
				isWide = (width > 640),
				playerYTClass;

			if (width < 854) {
				playerYTClass = 'watch-small';
			} else if (width < 1280) {
				playerYTClass = 'watch-medium';
			} else {
				playerYTClass = 'watch-large';
			}

			// Remove the previous YTPSO class
			removeClass(this.classRoot, this.previousYTPSOClass);

			// Add the custom class for our player size
			addClass(this.classRoot, 'ytpso-' + width + 'x' + height);
			this.previousYTPSOClass = 'ytpso-' + width + 'x' + height;

			// Set #player's class to the closest default YT one for compatibility with e.g. annotations.
			removeClass(this.player, 'watch-small');
			removeClass(this.player, 'watch-medium');
			removeClass(this.player, 'watch-large');
			addClass(this.player, playerYTClass);

			if (isWide) {
				removeClass(this.player, 'watch-playlist');
				addClass(this.player, 'watch-playlist-collapsed');

				addClass(this.container, 'watch-wide');
			} else {
				removeClass(this.player, 'watch-playlist-collapsed');
				addClass(this.player, 'watch-playlist');

				removeClass(this.container, 'watch-wide');
			}
		};

		// Create an instance of YTPSO and ask it to handle its initialization timing
		var YTPSO_script = new YTPSO();
		YTPSO_script.handleInitializationTiming();
	};

	/**
	 * Add YTPSO_OnPage to the end of <body> in script tags.
	 */
	var attachOnPage = function() {
		var scriptElem = document.createElement('script');
		scriptElem.innerHTML = "(" + YTPSO_OnPage + ")(window);";

		document.body.appendChild(scriptElem);
	};

	attachOnPage();
})();
