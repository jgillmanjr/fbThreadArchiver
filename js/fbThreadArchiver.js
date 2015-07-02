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

			if (revisionList.length) {
				childContent = revisionList;
			} else {
				childContent = 'No Revisions for This Thread';
			}

			if (row.child.isShown()) {
				row.child.hide();
			} else {
				row.child(childContent).show();
			}
		});

		// Listen to the main rows to display the current version of a thread
		$('td.threadTitle, td.threadID').on('click', function () {
			var tr = $(this).closest('tr');
			var row = fbta.misc.tocTable.row(tr);
			var threadID = row.data().threadID;
			var threadFile = fbta.props.archiveDir + '/' + threadID + '/current/' + fbta.props.dataFile;
			var threadImgDir = fbta.props.archiveDir + '/' + threadID + '/img';
			var threadData;
			var display = $('#display');
			
			/*
			 * Get the thread's data
			 */
			$.ajax({
				url: threadFile,
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

			// Initial Post
			display.append(
				'<div id="postDiv">' +
				'<div id="postInfo"><span id="postBy">Posted by: </span><span class="authorName">' + threadData.creator + ' </span><span id="postTime"> @ ' + threadData.updatedTime + '</span></div>' +
				'<div class="postMessage">' + threadData.message + '</div>' +
				'</div>'
			);

			// Build the comment container
			display.append('<div id="commentsDiv"></div>');

			// Run through comments (if any)
			_.each(threadData.comments, function(val, idx, list) {
				// Check if there's a photo with the comment
				var photo;
				if ('imageFile' in val){
					photo = '<div class="commentPhoto"><img src="' + threadImgDir + '/' + val.imageFile + '"></div>';
				} else {
					photo = '';
				}

				$('#commentsDiv').append(
					'<div class="commentDiv">' +
					'<div><span class="postedBy">Posted by: </span><span class="authorName">' + val.from.name + '</span><span class="commentTime"> @ ' + val.created_time +'</span></div>' +
					'<div class="commentMessage">' + val.message + '</div>' +
					photo +
					'<div class="commentLikes">Likes: ' + val.like_count + '</div>' +
					'</div>'
				);
			});
		});
	}
));
