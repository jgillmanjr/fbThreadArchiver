(function (context) {
	context.fbta = {};

	context.fbta.props = {
		indexObj: {},
		topLevel: [], // Thread IDs to Titles for use in the DataTable
		archiveDir: 'archive',
		dataFile: 'data.json',
	};

	context.fbta.misc = {};

	context.fbta.methods = {
		buildIdx: function () {
			/*
			 * Import the raw index file
			 */
			$.ajax({
				url: 'index.json',
				datatype: 'json',
				async: false,
				method: 'GET',
				success: function (data, status, jqXHR) {
					fbta.props.indexObj = data;
				},
			});

			/*
			 * Build an array for DataTable use
			 */
			_.each(fbta.props.indexObj, function (val, key, list) {
				fbta.props.topLevel.push({
					title: val.userTitle,
					threadID: key,
					revisions: val.revisions.length
				});
			});

			/*
			 * Generate the table of contents
			 */
			fbta.misc.tocTable = $('#toc').DataTable({
				data: fbta.props.topLevel,
				columns: [
					{data: 'threadID', title: 'Thread ID', className: 'threadID'},
					{data: 'title', title: 'Title', className: 'threadTitle', width: '50%'},
					{data: 'revisions', title: 'Revision Count', className: 'threadRevCount'}
				],
				order: [[2, 'desc']] // Show threads with most activity at top
			});
		},
		displayThread: function (dataFile, imgDir) {
			var threadData;
			var display = $('#display');
			
			/*
			 * Get the thread's data
			 */
			$.ajax({
				url: dataFile,
				datatype: 'json',
				async: false,
				method: 'GET',
				success: function (data, status, jqXHR) {
					threadData = data;
				}
			});

			// Clear out anything existing in the display div
			display.empty();

			/*
			 * Build it out...
			 */

			// Use for building comments, and for handling differences in "top level" and "reply" comments
			var buildComment = function (commentData, parentID) {
				var commentDivClass;
				var mainComment = true;
				if (parentID) { // We're dealing with a comment of a comment
					commentDivClass = 'replyCommentDiv';
					mainComment = false;
				} else {
					commentDivClass = 'commentDiv';
				}

				// Check if there's a photo with the comment
				var photo;
				if ('imageFile' in commentData){
					photo = '<div class="commentPhoto"><img src="' + imgDir + '/' + commentData.imageFile + '"></div>';
				} else {
					photo = '';
				}

				var commentBlock = 
					'<div class="' + commentDivClass + '" id="' + commentData.id + '">' +
					'<div class="postInfo"><span class="postedBy">Posted by: </span><span class="authorName">' + commentData.from.name + '</span><span class="commentTime"> @ ' + commentData.created_time +'</span></div>' +
					'<div class="commentMessage">' + commentData.message + '</div>' +
					photo +
					'<div class="commentLikes">Likes: ' + commentData.like_count + '</div>' +
					'</div>';

				if (mainComment) {
					$('#commentsDiv').append(commentBlock);
				} else {
					$('#' + parentID).append(commentBlock);
				}

				// Check to see if we have subcomments as part of this. If so, do needful.
				if ('comments' in commentData) {
					_.each(commentData.comments.data, function (val, idx, list) {
						buildComment(val, commentData.id);
					});
				}
			 };

			// Initial Post
			display.append(
				'<div id="postDiv">' +
				'<div class="postInfo"><span id="postBy">Posted by: </span><span class="authorName">' + threadData.creator + ' </span><span id="postTime"> @ ' + threadData.createdTime + '</span></div>' +
				'<div class="postMessage">' + threadData.message + '</div>' +
				'</div>'
			);

			// Build the comment container
			display.append('<div id="commentsDiv"></div>');

			// Run through comments (if any)
			_.each(threadData.comments, function(val, idx, list) {
				buildComment(val);
			});
		}
	};
})(window);

($(
	function () {
		fbta.methods.buildIdx();

		/*
		 * Setup Event Listeners
		 */
		// TOC Row Controller
		$('td.threadRevCount').on('click', function () {
			var tr = $(this).closest('tr');
			var row = fbta.misc.tocTable.row(tr);
			var threadID = row.data().threadID;

			var childContent;
			var revisionList = fbta.props.indexObj[threadID].revisions;
			var hasRevisions = false;

			if (revisionList.length) {
				childContent = revisionList;
				hasRevisions = true;
			} else {
				childContent = 'No Revisions for This Thread';
			}

			if (row.child.isShown()) {
				row.child.hide();
			} else {
				if (hasRevisions) {
					childContent.sort();
					var childList = [];
					_.each(childContent, function (val, idx, list) {
						childList.push($.parseHTML('<tr class="revisionRow" data-threadID="' + threadID + '"><td></td><td>' + val + '</td></tr>'));
					});
					row.child(childList).show();
				} else {
					row.child(childContent).show(); // Don't add the class so the listener doesn't fire if we don't have a revision
				}
			}
		});

		// Listen to the main rows to display the current version of a thread
		$('td.threadTitle, td.threadID').on('click', function () {
			var tr = $(this).closest('tr');
			var row = fbta.misc.tocTable.row(tr);
			var threadID = row.data().threadID;
			var threadFile = fbta.props.archiveDir + '/' + threadID + '/current/' + fbta.props.dataFile;
			var threadImgDir = fbta.props.archiveDir + '/' + threadID + '/img';
			
			fbta.methods.displayThread(threadFile, threadImgDir);
		});

		// Listen to the revision rows to display the older version
		$('tbody').on('click', 'tr.revisionRow', function () {
			var threadID = $(this).attr('data-threadID');
			var threadFile = fbta.props.archiveDir + '/' + threadID + '/revision/' + $(this).text() + '/' + fbta.props.dataFile;
			var threadImgDir = fbta.props.archiveDir + '/' + threadID + '/img';

			fbta.methods.displayThread(threadFile, threadImgDir);
		});
	}
));
