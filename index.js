// jpm run -b /usr/bin/firefox --binary-args http://resizemybrowser.com/
// Import useful built-in libraries
const {Cc, Ci, Cu} = require('chrome');
const l10nString = require('sdk/l10n').get;
const data = require('sdk/self').data;
const {ToggleButton} = require('sdk/ui/button/toggle');
const panels = require('sdk/panel');
const tabs = require('sdk/tabs');
const {Hotkey} = require('sdk/hotkeys');
const {open} = require('sdk/window/utils');

// Import static configurations
const Functions = [
  {id:'rExtractor',       key:'control-alt-m',   keyText:'Ctrl + Alt + M',   separator:false}
]; // const Functions = [ ... ];
const contentScripts = [
  data.url('libs/chroma.min.js'),
  data.url('libs/deltae.global.min.js'),
  data.url('VisualSimilarity.js'),
  data.url('TreeTraversal.js'),
  data.url('NodeCompare.js'),
  data.url('DataRecordsExtraction.js'),
  data.url('main-panel.js')
]; // const contentScripts = [ ... ];

// Global variables
const {URLS, GROUP_SIZE} = require('./urls.js');
var current, finished;

// Extension function unit 1: tool-bar button
const button = ToggleButton({
  id: 'Btn-DataExtraction',
  label: l10nString('addon_label'),
  icon: { '16': l10nString('icon_16'), '32': l10nString('icon_32'), '64': l10nString('icon_64') },
  onChange: function(state) { if (state.checked)  panel.show({position: button}); }
}); // const button = ToggleButton({ ... });

// Extension function unit 2: menu panel
const panel = require('sdk/panel').Panel({
  contentURL: data.url('main-panel.html'),
  contentScriptFile: data.url('main-panel.js'),
  onHide: function() { button.state('window', {checked: false}); },
  onShow: function() {
    var menuItems = [];
    for (i in Functions) {
      Functions[i].text = l10nString(Functions[i].id + '_mi');
      Functions[i].img = l10nString(Functions[i].id + '_img');
      menuItems.push(Functions[i]);
    } // for (i in Functions)
    panel.port.emit('load', menuItems);
  } // onShow: function() { ... }
}); // const panel = require('sdk/panel').Panel({ ... });

/**
 * Event Handler Registration
 */
(function register() {
  Functions.map(function(mi) {
    var handler = function() {
      panel.hide();
      EventHandler(mi.id, tabs.activeTab);
    }; // var handler = function() { ... };
    panel.port.on(mi.id, handler);
    Hotkey({combo:mi.key, onPress:handler});
  }); // Functions.map(function(mi) {});
})();

/**
 * Event handler of each menu item clicking
 * @param event     {@code string} The event of the caller (menu item id)
 */
const EventHandler = (event, tab) => {
  const worker = tab.attach({ contentScriptFile:contentScripts });
  var filename = tab.url.replace(/\\/g, '%5C').replace(/\//g, '%2F').replace(/\:/g, '%3A')
                        .replace(/\*/g, '%2A').replace(/\?/g, '%3F').replace(/\"/g, '%22')
                        .replace(/\</g, '%3C').replace(/\>/g, '%3E').replace(/\|/g, '%7C');
  filename = filename+"-"+event;				
						
  Cu.import('resource://gre/modules/Services.jsm');
  var fileNoExt = Services.dirsvc.get('DfltDwnld', Ci.nsIFile);
  fileNoExt.append(filename);

  // Send the corresponding event to the active tab
  worker.port.emit('request-' + event, new Date().getTime());

  // Receive the response
  worker.port.on('response-' + event,  function(time, totalDataRecords){
	open('data:text/html, <html><head><title>' + 'Extraction Result' + '</title><style>table,td{border:1px solid black;border-collapse:collapse;font-size:13px;}</style></head>'+
		'<body>'+ time+' ms <br/><br/>'+totalDataRecords+' Data Records found'+'</body></html>',
		{ features: {width: 230, height: 100, centerscreen: true, resizable: 1} }
	);
	console.log(time+' ms');
   });
}; 

