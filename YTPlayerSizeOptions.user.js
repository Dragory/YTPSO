// ==UserScript==
// @name           YouTube Player Size Options
// @namespace      http://www.mivir.fi/
// @description    Adds three options for YouTube's player size: 360p (S), 480p (M) and 720p (L).
// @include        http://*.youtube.com/watch*
// @include        http://youtube.com/watch*
// @include        https://*.youtube.com/watch*
// @include        https://youtube.com/watch*
// @version        2.2
// @grant          none
// ==/UserScript==

/**
 * HELPERS
 */

// Thanks to jQuery for reference for hasClass and removeClass.
// You guys are geniuses.
function hasClass(elem, theClass)
{
	if ( ! elem) return;

	var classes = " " + elem.className + " ";
	classes = classes.replace(/[\t\r\n]+/g, " ");

	return classes.indexOf(" " + theClass + " ") >= 0;
};

function removeClass(elem, theClass)
{
	if ( ! elem) return;

	var classes = " " + elem.className + " ";
	classes = classes.replace(/[\t\r\n]/g, " ");

	classes = classes.replace(" " + theClass + " ", " ");

	elem.className = classes.trim();
};

// http://stackoverflow.com/a/196038
function addClass(elem, theClass)
{
	if ( ! elem) return;
	if ( ! hasClass(elem, theClass)) elem.className += " " + theClass;
};

/**
 * The YouTube Player Size Options object/"class"
 */

var YTPSO = function() {
	this.playerSizes = {
		//  x     y
		1: [640,  390],
		2: [854,  510],
		3: [1256, 737]
	};

	// Store the previously added class (e.g. ytpso-1280x720) so we
	// can remove it by name later on.
	this.previousYTPSOClass = '';

	// Were we previously on a wide player?
	this.previousWide = false;

	// The element to place our/YTPSO's classes in
	this.classRoot = document.body;

	// The container for the player, player buttons (underneath it), comments, etc.
	// Some of YouTube's own classes (such as watch-wide) are placed in this element.
	this.container = document.getElementById('watch7-container');

	// The container for the buttons underneath the player
	this.buttonContainer = document.getElementById('watch7-sentiment-actions');

	// Start working on the player size and the buttons for controlling that
	this.init();
};

/**
 * Saves the player's size identifier or index in localStorage.
 *
 * @param   {int}        index  The index for the size (see this.playerSizes)
 *
 * @return  {undefined}
 */
YTPSO.prototype.saveSize = function(index)
{
	localStorage.setItem('YTPSO-sizeId', index);
};

/**
 * Loads a saved size index stored in localStorage.
 *
 * @return  {mixed}  The index (int) when it's found and in this.playerSizes,
 *                   null if it's not found or not in this.playerSizes.
 */
YTPSO.prototype.loadSize = function()
{
	var savedId = localStorage.getItem('YTPSO-sizeId');

	if (savedId && this.playerSizes[savedId]) return savedId;
	else return null;
};

/**
 * Initializes YTPSO.
 *
 * @return  {undefined}
 */
YTPSO.prototype.init = function()
{
	// If the player container doesn't exist, don't continue.
	// This can sometimes happen even though the script actually works
	// and runs again later on. Not sure what's causing that, but this should
	// prevent error messages about it.
	if ( ! this.container) return;

	// If we have a saved player size, use that
	var size = this.loadSize();
	if (size) this.setPlayerSize(this.playerSizes[size]);

	// Add our class to the container
	addClass(this.container, 'ytpso');

	// Create our custom styles for the player
	this.addStyles();

	// Create and bind the buttons
	this.addButtons();
};

YTPSO.prototype.addStyles = function()
{
	var styles = '';
	for (var i in this.playerSizes) {
		var width = this.playerSizes[i][0];
		var height = this.playerSizes[i][1];

		// We add "body" in front to give our selectors more priority
		// than the default selectors.
		var className = 'body.ytpso-' + width + 'x' + height;

		styles += className + '{}';

		// The player size
		styles += className + ' #player-api {';
			styles += 'width: ' + width + 'px;';
			styles += 'height: ' + height + 'px;';
		styles += '}';

		// Make sure the tray is the right height. The video's height
		// is the player's height minus 30 pixels and the tray's height adds
		// three pixels to that (probably to compensate for the smaller version
		// of the video loading/progress bar below the video (the one with the larger version
		// that can overlap the video a bit when the video's paused and/or in focus)).
		styles += className + ' #watch7-playlist-tray-container {';
			styles += 'height: ' + (height - 27).toString() + 'px;';

			// Make sure the playlist tray gets is always visible on the narrow player.
			// The wider players' playlist tray styles get overriden later on.
			styles += 'opacity: 1;';
		styles += '}';

		styles += className + ' .watch7-playlist-bar {';
			styles += 'width: ' + width + 'px;';
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
			styles += 'width: ' + (Math.max(1003, width)) + 'px;';
		styles += '}';
	}

	// Make it so the HTML5 player scales with its container (the "player API")
	styles += '.ytpso .watch-stream {';
		styles += 'width: 100%;';
		styles += 'height: 100%;';
		styles += 'left: 0;';
	styles += '}';

	// Some styles for wider players
	styles += 'body.ytpso-wide {}';

	// Even more selector priority here
	// With the smaller players the playlist video list
	// doesn't actually overlap the video but resides on
	// the right side of it. In those cases, we let YouTube's
	// own styles handle playlist bar's width.
	styles += 'html body.ytpso-narrow .watch7-playlist-bar {';
		styles += 'width: auto;';
	styles +='}';

	// Make sure the playlist tray always has the bottom border on the narrow player
	styles += 'html body.ytpso-narrow #watch7-playlist-tray {';
		styles += 'border-bottom: 27px solid #1B1B1B;';
	styles += '}';

	// Make sure the playlist bar toggle button is always hidden on the narrow player
	styles += 'html body.ytpso-narrow #watch7-playlist-bar-toggle-button {';
		styles += 'display: none;';
	styles += '}';

	// Make sure the playlist tray gets set to height 0 when it's collapsed with the wide player.
	styles += 'html body.ytpso-wide .watch-playlist-collapsed #watch7-playlist-tray-container {';
		styles += 'height: 0;';
		styles += 'opacity: 0;';
	styles += '}';

	// Make sure the sidebar always stays down with the wider player(s).
	styles += 'body.ytpso-wide #watch7-sidebar {';
		styles += 'margin-top: 0;';
		styles += 'padding-top: 15px;';
	styles += '}';

	var styleElement = document.createElement('style');
	styleElement.type = 'text/css';
	styleElement.innerHTML = styles;

	document.head.appendChild(styleElement);
};

/**
 * Adds the buttons underneath the player.
 *
 * @return  {undefined}
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
 * Changes the player's size to given dimensions.
 *
 * @param   {array}  size  The desired player size with X at index 0 and Y at index 1.
 *
 * @return  {undefined}
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
			addClass(this.container, 'watch-playlist-collapsed');
		}

		// Set the previousWide setting so, that we are on a wide player
		this.previousWide = true;

		// Make sure the styles for the larger player(s) are
		// used for the larger player(s).
		addClass(this.container, 'watch-wide watch-medium');

		// Add our "wide" style/class
		addClass(this.classRoot, 'ytpso-wide');

		// Remove our "narrow" style/class
		removeClass(this.classRoot, 'ytpso-narrow');
	} else {
		// Set the previousWide setting so, that we are on a narrow player
		this.previousWide = false;

		// With the smaller players the playlist tray is also
		// always visible, so let's do that.
		removeClass(this.container, 'watch-playlist-collapsed');

		// Make sure the styles for the larger player(s)
		// are not used for the smaller player.
		removeClass(this.container, 'watch-wide');
		removeClass(this.container, 'watch-medium');

		// Add our "narrow" style/class
		addClass(this.classRoot, 'ytpso-narrow');

		// Remove our "wide" style/class
		removeClass(this.classRoot, 'ytpso-wide');
	}
};

// Create an instance of YTPSO
var YTPSO_script = new YTPSO;