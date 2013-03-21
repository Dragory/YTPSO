// ==UserScript==
// @name           YouTube Player Size Options
// @namespace      http://www.mivir.fi/
// @description    Adds three options for YouTube's player size: 360p (S), 480p (M) and 720p (L).
// @include        http://*.youtube.com/watch*
// @include        http://youtube.com/watch*
// @include        https://*.youtube.com/watch*
// @include        https://youtube.com/watch*
// @version        2.1
// @grant          none
// ==/UserScript==

/**
 * HELPERS
 */

// Thanks to jQuery for reference for hasClass and removeClass.
// You guys are geniuses.
function hasClass(elem, theClass)
{
	var classes = " " + elem.className + " ";
	classes = classes.replace(/[\t\r\n]+/g, " ");

	return classes.indexOf(" " + theClass + " ") >= 0;
};

function removeClass(elem, theClass)
{
	var classes = " " + elem.className + " ";
	classes = classes.replace(/[\t\r\n]/g, " ");

	classes = classes.replace(" " + theClass + " ", " ");

	elem.className = classes.trim();
};

// http://stackoverflow.com/a/196038
function addClass(elem, theClass)
{
	if (!hasClass(elem, theClass)) elem.className += " " + theClass;
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

	// The container for the player, player buttons (underneath it), comments, etc.
	this.container = document.getElementById('watch7-container');

	// The container for the player itself (both, Flash and HTML5)
	this.player = document.getElementById('player-api');

	// The HTML5 player's video element
	this.html5Player = document.getElementsByClassName('watch-stream')[0];

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
	// If we have a saved player size, use that
	var size = this.loadSize();
	if (size) this.setPlayerSize(this.playerSizes[size]);

	// Create and bind the buttons
	this.addButtons();
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
	if (!size instanceof Array || size.length != 2) return;

	// Get our sizes
	var width  = size[0];
	var height = size[1];
	var useWide = (width > 640); // The wide player has some differences

	if (useWide) addClass(this.container, 'watch-wide');
	else removeClass(this.container, 'watch-wide');

	// Make it so the HTML5 player scales with its container (the "player API")
	if (this.html5Player) {
		this.html5Player.style.width = '100%';
		this.html5Player.style.height = '100%';
		this.html5Player.style.left = '0';
	}

	// Set the player container's size
	this.player.style.width  = width + 'px';
	this.player.style.height = height + 'px';
};

// Create an instance of YTPSO
var YTPSO_script = new YTPSO;