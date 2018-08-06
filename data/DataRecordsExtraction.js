var nodeCompare=new NodeCompare();
/**
 * Extract data records from a specific data region or from an entire webpage
 * @param treeRoot              root node of the webpage tree or the data region subtree
 */
function extractRecords(treeRoot){
	
	var similarNodesList=[];
	
	// Traverse the target tree and collect its nodes
	var traverse = new Traversal(treeRoot);
	traverse.preorder(treeRoot);
    var blockList = traverse.nodeQueue;
	
	// Set the width and height attributes of each node
	for(var i=0; i<blockList.length ; i++){
		blockList[i].setAttribute('width', Math.abs(parseInt(blockList[i].getAttribute('right')) - parseInt(blockList[i].getAttribute('left'))));
		blockList[i].setAttribute('height', Math.abs(parseInt(blockList[i].getAttribute('bottom')) - parseInt(blockList[i].getAttribute('top'))));
	}
    
	var childLists=[];
	for(var i=0; i<blockList.length ; i++){
		var block=blockList[i];
		traverse = new Traversal(block);
		traverse.preorder(block);
		var subBlockList = traverse.nodeQueue, basicBlocks=getBasicBlocks(subBlockList);
		block.setAttribute('childListIndex', childLists.length);
		childLists.push(basicBlocks);
	}
	
	// Get the basic blocks from the list of all the stored blocks
	var basicBlocks=getBasicBlocks(blockList);
	// Get container blocks from the list of all the stored blocks
	var containerBlocks=getContainerBlocks(blockList)
	
	// Find the horizontal (pageCenterX) and vertical (pageCenterY) centers of the page
	var pageCenterX, pageCenterY; 
	var body = document.body, html = document.documentElement,
        pageHeight = Math.max( body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight ),
	    pageWidth = Math.max( body.scrollWidth, body.offsetWidth, html.clientWidth, html.scrollWidth, html.offsetWidth );
	pageCenterX = pageWidth/2;
	pageCenterY = pageHeight/2;
	
	var seedBlock=getSeedBlock(basicBlocks, pageCenterX, pageCenterY, pageHeight);
	//updateNode(seedBlock);
	
	var candidateRecordBlocks=[];
	for(var i=0; i<blockList.length ; i++){
		var block=blockList[i];
		if(block==seedBlock) continue;
		// Save block if it is one of the ancestors of seedBlock
		if(isOneOfAncestorsOfNodeA(seedBlock,block))
			candidateRecordBlocks.push(block);
	}
	listSorting(candidateRecordBlocks,'top', 'left', 'Descending');
	/*for(var i=0; i<candidateRecordBlocks.length; i++){
		updateNode(candidateRecordBlocks[i]);
		alert("Container "+(i+1));
	}*/
	
	var similarCandidateRecordBlocks=[];
	for(var i=0; i<containerBlocks.length; i++){
		var containerBlock=containerBlocks[i];
		for(var j=0; j<candidateRecordBlocks.length; j++){
			var candidateRecordBlock=candidateRecordBlocks[j];
			if(containerBlock!==candidateRecordBlock && 
			   Math.abs(parseInt(containerBlock.getAttribute('width')) - parseInt(candidateRecordBlock.getAttribute('width')))<=5 &&
			   similarCandidateRecordBlocks.indexOf(containerBlock)==-1
			   )
			   similarCandidateRecordBlocks.push(containerBlock);   
		}
	}
	
	var clusters=clusterCandidateRecordBlocks(candidateRecordBlocks, similarCandidateRecordBlocks), maxLength=0, dataRecords=null;
	
	var allChildClusters=[], allRepLists=[];
	for(var i=0; i<clusters.length; i++){
		var cluster=clusters[i];
		//alert('Cluster '+i);
		//updateNodes(cluster);
		for(var j=0; j<cluster.length; j++){
			var block=cluster[j], childList=childLists[parseInt(block.getAttribute('childListIndex'))];
			//alert('block '+j);
			//updateNodes(childList);
			var childClusters=clusterChildBlocks(childList), repList=getRepListOfClusters(childClusters);
			block.setAttribute('childClustersIndex', allChildClusters.length);
			allChildClusters.push(childClusters);
			block.setAttribute('repListIndex', allRepLists.length);
			allRepLists.push(repList);
			/*for(var k=0; k<childClusters.length; k++){
				var childCluster=childClusters[k];
				if(i==0){
					alert("block:"+ j+"  childCluster:"+k);
					updateNodes(childCluster);
				}
			}*/
		}
		var clustersOfCluster=clusterByContentSimilarity(cluster, allChildClusters, allRepLists);
		for(var j=0; j<clustersOfCluster.length; j++){
			if(clustersOfCluster[j].length>maxLength){
				maxLength=clustersOfCluster[j].length;
				dataRecords=clustersOfCluster[j];
			}
		}
		/*if(i==0){
			alert("total: "+clustersOfCluster.length);
			for(var j=0; j<clustersOfCluster.length; j++){
				var c=clustersOfCluster[j];
				alert(j+"    size="+c.length);
				updateNodes(c);
			}
		}*/
	}
	
	if(dataRecords){
		//alert(dataRecords.length);
		for(var i=0; i<dataRecords.length; i++)
			updateNode(dataRecords[i]);
	}
	return dataRecords.length;
}

/**
 * Get leaf nodes of a data record
 * @param dataRecord            root node of the data record tree
 * @param treeType              {@code String} the tree type string: 'BT' or 'VT'
 * @returns leaves				{@code Array} array of leaf nodes
 */
function getBasicBlocks(blockList){
	var leaves=[];
	for(var i=0; i<blockList.length; i++){
		var block=blockList[i];
		if(block.hasChildNodes()===false)
			leaves.push(block);
	}
	return leaves;
}

function getContainerBlocks(blockList){
	var containers=[];
	for(var i=0; i<blockList.length; i++){
		var block=blockList[i];
		if(block.hasChildNodes()===true)
			containers.push(block);
	}
	return containers;
}

/**
 * Get the seed basic block
 * @param basicBlocks		    {@code Array} array of identified basic blocks on the web page
 * @param pageCenterX			X coordinate of the center of the web page
 * @param pageCenterY			Y coordinate of the center of the web page
 */
 function getSeedBlock(basicBlocks, pageCenterX, pageCenterY, pageHeight){
	 var seedBlock=null, x=pageCenterX, y=pageCenterY, XYArray=getXYArray(x,y,pageHeight), index=0;
	 while(!seedBlock && index<XYArray[0].length){
		 seedBlock=checkCurrentLocation(basicBlocks, x, y);
		 x=XYArray[0][index];
		 y=XYArray[1][index];
		 index++;
	 }
	 return seedBlock;
 }
 
 function getXYArray(x,y,pageHeight){
	var XYArray=[], XArray=[], YArray=[];
	for(var i=1; i<pageHeight; i++){
		for(var j=1; j<=2; j++){
			for(var k=1; k<=i; k++){
				if(i%2!=0){ //odd
					if(j==1){
						x=x-1;
						y=y;
						XArray.push(x);
						YArray.push(y);
					}else{
						x=x;
						y=y-1;
						XArray.push(x);
						YArray.push(y);
					}
				}else{ //even
					if(j==1){
						x=x+1;
						y=y;
						XArray.push(x);
						YArray.push(y);
					}else{
						x=x;
						y=y+1;
						XArray.push(x);
						YArray.push(y);
					}
				}
			}
		}
	} 
	XYArray[0]=XArray;
	XYArray[1]=YArray;
	return XYArray;
 }
 
 function checkCurrentLocation(basicBlocks, x, y){
	 for(var i=0; i<basicBlocks.length; i++){
		 var block=basicBlocks[i];
		 var left=parseInt(block.getAttribute('left')), right=parseInt(block.getAttribute('right')),
		     top=parseInt(block.getAttribute('top')), bottom=parseInt(block.getAttribute('bottom'));
		 if( x>=left && x<=right && y>=top && y<=bottom )
			 return block;
	 }
	 return null;
 }
 
 function clusterCandidateRecordBlocks(candidateRecordBlocks, similarCandidateRecordBlocks){
	var clusters=[], clustered=[];
	for(var i=0; i<candidateRecordBlocks.length; i++){
		var candidateRecordBlock=candidateRecordBlocks[i];
		//updateNode(candidateRecordBlock);
		//alert(clustered.indexOf(candidateRecordBlock));
		// Check if candidateRecordBlock is already clustered
		//if(clustered.indexOf(candidateRecordBlock)>=0)
			//continue;
		// Put candidateRecordBlock in a new cluster
		var cluster=[candidateRecordBlock];
		// Mark candidateRecordBlock as clustered
		clustered.push(candidateRecordBlock);
		for(var j=0; j<similarCandidateRecordBlocks.length; j++){ 
			var similarCandidateRecordBlock=similarCandidateRecordBlocks[j];
			// 
			if(clustered.indexOf(similarCandidateRecordBlock)<0 && 
			   similarCandidateRecordBlock!==candidateRecordBlock &&
			   Math.abs(parseInt(similarCandidateRecordBlock.getAttribute('width')) - parseInt(candidateRecordBlock.getAttribute('width')))<=5){
				// Put similarCandidateRecordBlock in the same cluster of candidateRecordBlock
				cluster.push(similarCandidateRecordBlock);
				// Mark similarCandidateRecordBlock as clustered
				clustered.push(similarCandidateRecordBlock);
			}
		}
		listSorting(cluster, 'top', 'left', 'Ascending');
		clusters.push(cluster);
		/*alert("** cluster "+(i)+"    "+cluster.length+" **");
		updateNodes(cluster);
		for(var j=0; j<cluster.length; j++){
			alert(j);
			updateNode(cluster[j]);
		}*/
	}
	return clusters;
}

function clusterChildBlocks(childList){
	var clusters=[], clusteredChildren=[];
	for(var i=0; i<childList.length; i++){
		var childA=childList[i];
		if(clusteredChildren.indexOf(childA)>-1)
			continue;
		var cluster=[childA];
		clusteredChildren.push(childA);
		for(var j=i+1; j<childList.length; j++){ 
			var childB=childList[j];
			if(clusteredChildren.indexOf(childB)<0 && nodeCompare.Compare(childA, childB)===1){
				cluster.push(childB);
				clusteredChildren.push(childB);
			}
		}
		clusters.push(cluster);
	}
	return clusters;
}

function getRepListOfClusters(childClusters){
	var repList=[];
	for(var i=0; i<childClusters.length; i++){
		var childCluster=childClusters[i], rep=childCluster[0];
		rep.setAttribute('indicator', childCluster.length);
		repList.push(rep);
	}
	return repList;
}
 
function clusterByContentSimilarity(blockList, allChildClusters, allRepLists){
	/*for(var i=0; i<cluster.length; i++){
		var block=cluster[i], childClusters=allChildClusters[parseInt(block.getAttribute('childClustersIndex'))],
		    repList=allRepLists[parseInt(block.getAttribute('repListIndex'))];

	}*/
	var clusters=[], clusteredBlocks=[];
	for(var i=0; i<blockList.length; i++){
		var blockA=blockList[i];
		if(clusteredBlocks.indexOf(blockA)>-1)
			continue;
		var cluster=[blockA], repListA=allRepLists[parseInt(blockA.getAttribute('repListIndex'))];
		clusteredBlocks.push(blockA);
		for(var j=i+1; j<blockList.length; j++){ 
			var blockB=blockList[j], repListB=allRepLists[parseInt(blockB.getAttribute('repListIndex'))];
			if(clusteredBlocks.indexOf(blockB)<0 && getContentSimilarity(blockA, blockB, repListA, repListB)>=0.4){
				cluster.push(blockB);
				clusteredBlocks.push(blockB);
			}
		}
		clusters.push(cluster);
	}
	return clusters;
}

function getContentSimilarity(blockA, blockB, repListA, repListB){
	var intersect=0, union=0, matchedRepA=[], matchedRepB=[];
	for(var i=0; i<repListA.length; i++){
		var repA=repListA[i], indicatorA=parseInt(repA.getAttribute('indicator'));
		for(var j=0; j<repListB.length; j++){
			var repB=repListB[j], indicatorB=parseInt(repB.getAttribute('indicator'));
			if(nodeCompare.Compare(repA, repB)===1){
				intersect=intersect+Math.min(indicatorA, indicatorB);
				matchedRepA.push(repA);
				matchedRepB.push(repB);
			}
		}
	}
	for(var i=0; i<repListA.length; i++){
		var repA=repListA[i], indicatorA=parseInt(repA.getAttribute('indicator'));
		if(matchedRepA.indexOf(repA)<0)
			union=union+indicatorA;
	}
	for(var i=0; i<repListB.length; i++){
		var repB=repListB[i], indicatorB=parseInt(repB.getAttribute('indicator'));
		if(matchedRepB.indexOf(repB)<0)
			union=union+indicatorB;
	}
	for(var i=0; i<matchedRepA.length; i++){
		var repA=matchedRepA[i], indicatorA=parseInt(repA.getAttribute('indicator')),
		    repB=matchedRepB[i], indicatoB=parseInt(repB.getAttribute('indicator'));
			union=union+Math.max(indicatorA, indicatorB);
	}
	return intersect*1.0/union;
}
 

/**
 * Sort nodes in an arry by two attributes
 * @param nodeList              {@code Array} an array of nodes
 * @param firstAttr             {@code String} an attribute string
 * @param secondAttr            {@code String} another attribute string
 * @param sortingType           {@code String} the sorting type string: 'ASCENDING' or 'DESCENDING'
 * @returns                     {@code Array} the sorted nodes' array 
 */
function listSorting(nodeList, firstAttr, secondAttr, sortingType){  
	if(sortingType.toUpperCase()==='ASCENDING'){
		nodeList.sort(function(nodeA,nodeB){
			var firstAttrSorting = parseInt(nodeA.getAttribute(firstAttr)) - parseInt(nodeB.getAttribute(firstAttr));
			// if the first attribute values of the two nodes are equal, compare the nodes by the second attribute
			return firstAttrSorting == 0 ? parseInt(nodeA.getAttribute(secondAttr)) - parseInt(nodeB.getAttribute(secondAttr)) : firstAttrSorting;
		});
	}else
		if(sortingType.toUpperCase()==='DESCENDING'){
			nodeList.sort(function(nodeA,nodeB){
				var firstAttrSorting = parseInt(nodeB.getAttribute(firstAttr)) - parseInt(nodeA.getAttribute(firstAttr));
				// if the first attribute values of the two nodes are equal, compare the nodes by the second attribute
				return firstAttrSorting == 0 ? parseInt(nodeB.getAttribute(secondAttr)) - parseInt(nodeA.getAttribute(secondAttr)) : firstAttrSorting;
			});
		}
}


/**
 * Check if nodeB is one of the ancestors of nodeA
 * @param nodeA                 a tree node
 * @param nodeB                 a tree node
 * @returns {@code Boolean}     {@code true} if nodeB is ancestor of nodeA, while {@code false} if it is not ancestor
 */
function isOneOfAncestorsOfNodeA(nodeA, nodeB){
	var nodeParent=nodeA.parentElement, isAncestor=false;
	while(nodeParent && !isAncestor){
		if(nodeParent===nodeB){
			isAncestor=true;
			break;
		}
        nodeParent=nodeParent.parentElement;
    } 
	return isAncestor;
}


/**
 * Update the background color and the box shadow of a node
 * @param node           	    a tree node
 */
function updateNode(node) {
	var color = chroma.random().css();
	var element = node.domElement;
	//element.style.boxShadow = '0px 0px 3px 3px #666';
	element.style.boxShadow = '0px 0px 3px 3px '+color;
	element.style.backgroundColor = color;
}

/**
 * Update the background color and the box shadow of a list of nodes
 * @param nodes           	    {@code Array} array of nodes
 */
function updateNodes(nodes) {
	var color=chroma.random().css();
	for(var i=0; i<nodes.length; i++){
		var node=nodes[i];
		var element = node.domElement;
		element.style.boxShadow = '0px 0px 3px 3px #666';
		element.style.backgroundColor = color;
	}
}
