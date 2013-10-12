// ==UserScript==
// @name           YouTube Player Size Options
// @namespace      http://www.mivir.fi/
// @description    Adds three options for YouTube's player size: 360p (S), 480p (M) and 720p (L).
// @include        http://*.youtube.com/watch*
// @include        http://youtube.com/watch*
// @include        https://*.youtube.com/watch*
// @include        https://youtube.com/watch*
// @version        2.4.3
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

			var classes = " " + elem.className + " ";
			classes = classes.replace(/[\t\r\n]+/g, " ");

			return classes.indexOf(" " + theClass + " ") >= 0;
		};

		var removeClass = function(elem, theClass)
		{
			if ( ! elem) return;

			var classes = " " + elem.className + " ";
			classes = classes.replace(/[\t\r\n]/g, " ");

			classes = classes.replace(" " + theClass + " ", " ");

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

			// Playlist tray min/max widths
			this.playlistTrayMaxWidth = 400;
			this.playlistTrayMinWidth = 275;

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
			var firstLoad = true;

			try {
				self.initialize();

				window.yt.pubsub.instance_.subscribe('init-watch', function() {
					self.initialize();
					return true;
				});
			} catch (e) {
				console.log('[YTPSO] Could not subscribe to the init-watch event. Initializing only on initial page load.');
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
		 * Builds our stylesheet and adds it on the page.
		 */
		YTPSO.prototype.addStyles = function()
		{
			var styles = '';

			/**
			 * Size-specific styles
			 */
			
			for (var i in this.playerSizes) {
				var width = this.playerSizes[i][0];
				var height = this.playerSizes[i][1];
				var isNarrow = (width <= this.narrowLimit);

				// The player AREA's width. This is the part that's centered.
				// The small player isn't centered by itself, as the sidebar
				// also takes some space on the side.
				var playerAreaWidth = Math.max(1003, width);

				// We add "body" in front to give our selectors more priority
				// than the default selectors.
				var className = 'body.ytpso-' + width + 'x' + height;

				styles += className + '{}';

				// The player's container's width
				styles += className + ' #player, ' + className + '.cardified-page #player {';
					styles += 'width: ' + playerAreaWidth + 'px;';
				styles += '}';

				// The player size
				styles += className + ' #player-api, ' + className + ' #player-api-legacy {';
					styles += 'width: ' + width + 'px;';
					styles += 'height: ' + height + 'px;';
				styles += '}';

				// Adjust the playlist bar's width
				var playlistTrayWidth = 0.32 * width;
				playlistTrayWidth = Math.min(this.playlistTrayMaxWidth, playlistTrayWidth);
				playlistTrayWidth = Math.max(this.playlistTrayMinWidth, playlistTrayWidth);
				playlistTrayWidth = Math.floor(playlistTrayWidth);

				var playlistBarTitleWidth = width - playlistTrayWidth;

				if (isNarrow) {
					// On narrow players, the left side of the playlist bar (containing the playlist name etc.)
					// should be as wide as the player itself (because the playlist tray's on the side, not on the player).
					styles += className + ' .watch7-playlist-bar-left {';
						styles += 'width: ' + width + 'px;';
					styles += '}';
				} else {
					styles += className + ' .watch7-playlist-bar {';
						styles += 'width: ' + width + 'px;';
					styles += '}';
					styles += className + ' .watch7-playlist-bar-left {';
						styles += 'width: ' + playlistBarTitleWidth + 'px;';
					styles += '}';
					styles += className + ' .watch-sidebar {';
						styles += 'width: ' + playlistTrayWidth + 'px;';
					styles += '}';
				}
				
				// Before we also applied this style to watch7-playlist-bar-right,
				// but the element which has that class also has .watch-sidebar so we don't have to.

				// The playlist tray should be as high as the player
				styles += className + ' #watch7-playlist-tray-container {';
					styles += 'height: ' + height + 'px;';

					// Make sure the playlist tray gets is always visible on the narrow player.
					// The wider players' playlist tray styles get overriden later on.
					styles += 'opacity: 1;';

					// If the player is not narrow, move the tray to the right side of the player.
					// On narrow players the tray is not on the player but next to it (so we don't need to move it).
					if ( ! isNarrow) {
						styles += 'left: ' + playlistBarTitleWidth + 'px;';
					}
				styles += '}';

				// Make sure the video managing bar is always the right width.
				// The 40 comes from the player container width minus the bar's
				// padding.
				styles += className + ' #watch7-creator-bar {';
					styles += 'width: ' + (width - 40) + 'px;';

					// For some reason the area below the video managing bar broke
					// with the largest player, so this is here to fix it. The set
					// height on the element doesn't seem to be mandatory, because
					// the buttons inside the bar are clearfixed.
					styles += 'height: auto;';
				styles += '}';

				// With the new centered layout, we also sometimes need to increase #content's width
				// if the player's width is over the default #content width to keep the player in the center.
				styles += className + ' #content {';
					styles += 'width: ' + playerAreaWidth + 'px;';
				styles += '}';
			}

			/**
			 * General fixes for differences between narrow and wide players.
			 */

			// Make it so the HTML5 player scales with its container (the "player API")
			styles += '.ytpso .watch-stream {';
				styles += 'width: 100%;';
				styles += 'height: 100%;';
				styles += 'left: 0;';
			styles += '}';

			// Some styles for wider players
			styles += 'body.ytpso-wide {}';

			/**
			 * The playlist bar and its parts
			 */
			styles += 'html body.ytpso-narrow .watch7-playlist-bar {';
				styles += 'width: auto;';
			styles += '}';

			styles += 'html body.ytpso-narrow .watch-sidebar {';
				styles += 'width: auto;';
			styles +='}';

			/**
			 * The playlist tray toggle button
			 */
			
			styles += 'html body.ytpso-wide #watch7-playlist-bar-toggle-button {';
				styles += 'display: inline;';
			styles +='}';

			styles += 'html body.ytpso-narrow #watch7-playlist-bar-toggle-button {';
				styles += 'display: none;';
			styles +='}';

			/**
			 * The playlist tray container
			 */
			
			// Larger players -> tray container has an absolute position (so it stays on the player)
			styles += 'html body.ytpso-wide #watch7-playlist-tray-container {';
				styles += 'position: absolute;';
			styles += '}';

			// Small player -> tray container has a relative position (so it getes pushed beyond the player).
			styles += 'html body.ytpso-narrow #watch7-playlist-tray-container {';
				styles += 'position: relative;';
			styles += '}';

			// Make sure the tray container gets set to height 0 when it's collapsed with the wide player.
			styles += 'html body.ytpso-wide .watch-playlist-collapsed #watch7-playlist-tray-container {';
				styles += 'height: 0;';
				styles += 'opacity: 0;';
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
		 */
		YTPSO.prototype.addButtons = function()
		{
			var self = this;

			// The container for YTPSO buttons
			var but_container = document.createElement('span');
			but_container.setAttribute('id', 'ytpso-buttons');

			// Small player button
			var but_s = document.createElement('button');;
			but_s.setAttribute('class', 'yt-uix-button yt-uix-button-text');
			but_s.innerHTML = 'S';

			but_s.onclick = function() {
				self.setPlayerSize(self.playerSizes[1]);
				self.saveSize(1);
			};

			but_container.appendChild(but_s);

			// Medium player button
			var but_m = document.createElement('button');;
			but_m.setAttribute('class', 'yt-uix-button yt-uix-button-text');
			but_m.innerHTML = 'M';

			but_m.onclick = function() {
				self.setPlayerSize(self.playerSizes[2]);
				self.saveSize(2);
			};

			but_container.appendChild(but_m);

			// Large player button
			var but_l = document.createElement('button');;
			but_l.setAttribute('class', 'yt-uix-button yt-uix-button-text');
			but_l.innerHTML = 'L';

			but_l.onclick = function() {
				self.setPlayerSize(self.playerSizes[3]);
				self.saveSize(3);
			};

			but_container.appendChild(but_l);

			// Add the buttons on the page
			this.buttonContainer.appendChild(but_container);
		};

		/**
		 * Changes the player's size to the given dimensions.
		 *
		 * @param   {Array}  size  The desired player size with X at index 0 and Y at index 1.
		 */
		YTPSO.prototype.setPlayerSize = function(size)
		{
			if ( ! size instanceof Array || size.length != 2) return;

			// Get our sizes
			var width  = size[0];
			var height = size[1];
			var useWide = (width > 640); // The wide player has some differences

			// Remove the previous YTPSO class
			removeClass(this.classRoot, this.previousYTPSOClass);

			// Add the custom class for our player size
			addClass(this.classRoot, 'ytpso-' + width + 'x' + height);
			this.previousYTPSOClass = 'ytpso-' + width + 'x' + height;

			if (useWide) {
				// If we're transitioning from a small/narrow/"non-wide" player,
				// hide the playlist (like YouTube does by default when switching
				// to the bigger player).
				if ( ! this.previousWide) {
					addClass(this.legacyPlayer, 'watch-playlist-collapsed');
					addClass(this.player, 'watch-playlist-collapsed');
				}

				// Set the previousWide setting so, that we are on a wide player
				this.previousWide = true;

				// Make sure the styles for the larger player(s) are
				// used for the larger player(s).
				addClass(this.container, 'watch-wide');
				addClass(this.legacyPlayer, 'watch-medium');
				addClass(this.player, 'watch-medium');

				// Add our "wide" style/class
				addClass(this.classRoot, 'ytpso-wide');

				// Remove our "narrow" style/class
				removeClass(this.classRoot, 'ytpso-narrow');
			} else {
				// Set the previousWide setting so, that we are on a narrow player
				this.previousWide = false;

				// With the smaller players the playlist tray is also
				// always visible, so let's do that.
				removeClass(this.legacyPlayer, 'watch-playlist-collapsed');
				removeClass(this.player, 'watch-playlist-collapsed');

				// Make sure the styles for the larger player(s)
				// are not used for the smaller player.
				removeClass(this.container, 'watch-wide');
				removeClass(this.legacyPlayer, 'watch-medium');
				removeClass(this.player, 'watch-medium');

				// Add our "narrow" style/class
				addClass(this.classRoot, 'ytpso-narrow');

				// Remove our "wide" style/class
				removeClass(this.classRoot, 'ytpso-wide');
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
