/**
 * Register event handlers to the menu items
 */
self.port.on('load', function(menuItems) {
  // Setup menu items
  while (document.body.firstElementChild)
    document.body.removeChild(document.body.firstElementChild);
  menuItems.map(function(mi) {
    var li = document.createElement('li');
    li.id = 'li-' + mi.id.toLowerCase();
    document.body.appendChild(li);

    // Menu item interface
    var img = document.createElement('img');
    img.id = 'img-' + mi.id.toLowerCase();
    img.src = mi.img;
    li.appendChild(img);
    var span = document.createElement('span');
    span.id = 'span-' + mi.id.toLowerCase();
    span.innerHTML = mi.text;
    li.appendChild(span);
    var code = document.createElement('code');
    code.innerHTML = mi.keyText;
    li.appendChild(code);
    var hr = document.createElement('hr');
    hr.className = mi.separator ? 'mi-sept' : ''
    document.body.appendChild(hr);

    // Menu item event handler
    li.onclick = function() {
      self.port.emit(mi.id);
    }; // li.onclick = function() { ... };
  }); // menuItems.map(function(mi) {});
}); // self.port.on('load', function(menuItems) {});

var debug = false;

/**
 * Register event handlers of the menu item - "r"
 */
self.port.on('request-rExtractor', function(startTime) {
  var visualTree = createTree(document.body, 'VT'), totalDataRecords;
  if(visualTree){
	totalDataRecords=extractRecords(visualTree);
  }else{
	  console.log("Visual Tree is undefined ..");
	  console.log("Unable to find any data record");
  }
  self.port.emit('response-rExtractor', new Date().getTime() - startTime, totalDataRecords);
});
