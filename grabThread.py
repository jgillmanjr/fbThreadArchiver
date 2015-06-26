#!/usr/bin/env python

"""
Just a little script to make relatively simple archives of facebook threads.

Do with it as you please

Also, it's pip install facebook-sdk, not just pip install facebook to get the lib
"""

### Import the needful
import facebook
import json
import iso8601
import pytz
import shutil
import time

import os
pathJoin = os.path.join # Because I'm lazy
pathExists = os.path.exists

import requests

tZone = pytz.timezone('US/Eastern') # Change as needed
scriptDir = os.path.dirname(os.path.abspath(__file__)) # In case you want to cron it or run it outside of the directory

#Get the API key
keyFile = open(pathJoin(scriptDir, 'apiKey.txt'))
apiToken = keyFile.read()
keyFile.close()

archiveDir = pathJoin(scriptDir, 'archive')
if not pathExists(archiveDir): # Make the archive directory if it doesn't exist
	os.mkdir(archiveDir)

# Get the thread list
threadFile = open(pathJoin(scriptDir, 'watchThreads.json'))
watchThreads = json.load(threadFile)
threadFile.close()

### Create the graph object
fbGraph = facebook.GraphAPI(apiToken)


def threadDirPrep(threadID):
	"""
	1. Check for thread specific directory (named by thread ID). Create if it doesn't exist.
	2. Check for existance of 'current' subdirectory and 'img' subdirectory. Create if doesn't exist.
	3. Same for 'revision' dir
	"""
	threadDir = pathJoin(archiveDir, threadID)
	if not pathExists(threadDir):
		os.mkdir(threadDir)

	for subDir in ['current', 'img', 'revision']:
		if not pathExists(pathJoin(threadDir, subDir)):
			os.mkdir(pathJoin(threadDir, subDir))

def getThreadData(threadID):
	"""
	Get data for the entire thread, massage it, and return it.
	"""

	def getCommentIDs():
		"""
		Get the list of Comment IDs to run
		"""
		for comment in rawData['comments']['data']:
			threadCommentIDs.append(comment['id'])

		if 'next' in rawData['comments']['paging']:
			anotherPage = rawData['comments']['paging']['next']

			while(anotherPage):
				comments = requests.get(anotherPage).json()

				for comment in comments['data']:
					threadCommentIDs.append(comment['id'])

				if 'next' in comments['paging']:
					anotherPage = comments['paging']['next']
				else :
					anotherPage = False
	def getCommentData():
		for commentId in threadCommentIDs:
			threadCommentData.append(fbGraph.get_object(commentId, **{'fields': 'from,message,attachment,like_count'}))

	threadCommentIDs = [] # IDs of comments to fully get, index to track order
	threadCommentData = [] # Actual comment data, index to track order

	# Get the initial dataz
	#rawData = fbGraph.get_object(threadID, **{'edges': 'comments'})
	rawData = fbGraph.get_object(threadID);

	if 'comments' in rawData:
		getCommentIDs()
		getCommentData()


	## DEBUG - leave in for now
	##pprint(threadCommentData)
	#pprint(rawData)

	## Now build a clean object to return
	cleanData = {}
	cleanData['comments'] = threadCommentData
	cleanData['message'] = rawData['message']
	if 'created_time' in rawData:
		cleanData['createTime'] = rawData['created_time']
	else:
		cleanData['updatedTime'] = rawData['updated_time']
	cleanData['creator'] = rawData['from']['name']
	if 'actions' in rawData:
		cleanData['link'] = rawData['actions'][0]['link']
	if 'picture' in rawData:
		cleanData['picture'] = rawData['picture']
	if 'likes' in rawData:
		cleanData['likes'] = rawData['likes']
	cleanData['id'] = rawData['id']

	return cleanData

def diffCheck(threadID):
	"""
	Check the thread's current directory for data.json

	If it's not there, check the 'current' directory for emptiness. If empty, no worries. If not empty, create a new revision.

	If it is there, pull it, compare it to the latest data. If different, copy 'current' contents to a revision, along with the json file
	"""
	threadDir = pathJoin(archiveDir, threadID)
	curDir = pathJoin(threadDir, 'current')
	dataFile = 'data.json'
	hasDiff = False

	def curToRev():
		revDir = pathJoin(threadDir,'revision', time.strftime('%d%b%Y-%H%M%S'))
		shutil.move(curDir, revDir)
		os.mkdir(curDir) # Because we moved it..
	
	def writeDataFile():
		jsonFP = open(pathJoin(curDir, dataFile), 'w')
		json.dump(threadData, jsonFP, indent = 4)
		jsonFP.close()

	if not os.path.isfile(pathJoin(curDir, dataFile)): # If we don't have the data.json..
		if os.listdir(curDir): # If it isn't empty, move stuff
			curToRev()
			hasDiff = True # For downstream purposes, we might as well had a diff since there was a revision made
		
		writeDataFile()

	else:
		curFile = open(pathJoin(curDir, dataFile))
		curData = json.load(curFile)
		curFile.close()
		
		if threadData != curData: # Looks like we have a revision..
			curToRev()
			writeDataFile()
			hasDiff = True

	return hasDiff

def getPhotos():
	"""
	Examine the main post and comments for photos

	Also add the 'refined' filename
	"""
	threadDir = pathJoin(archiveDir, threadID)
	imgDir = pathJoin(threadDir, 'img')

	# Implement the main post when facebook's API wants to be nice

	# Get photos from comments
	for comment in threadData['comments']:
		if 'attachment' in comment:
			imageUri = comment['attachment']['media']['image']['src']
			imageFileName = imageUri.split('?')[0].split('/')[-1]
			imageData = requests.get(imageUri).content
			imagePath = pathJoin(imgDir, imageFileName)
			comment['imageFile'] = imageFileName

			if not pathExists(imagePath):
				imageHandle = open(imagePath, 'wb')
				imageHandle.write(imageData)
				imageHandle.close()

			print imageFileName

from pprint import pprint # Keep for now
for threadID, threadTitle in watchThreads.iteritems():
	try: ## Check just in case the ID went invalid
		fbGraph.get_object(threadID)
	except facebook.GraphAPIError:
		## Invalid, so go to the next iteration
		continue

	threadID = str(threadID) # String it just in case it was entered as int
	### Comments for the time being to determine how functions will be built. Clear comments as function is built###

	threadDirPrep(threadID)
	threadData = getThreadData(threadID)
	threadData['userTitle'] = threadTitle # The user supplied title

	## Now that we have the thread data..

	### Check if things are different
	if diffCheck(threadID):
		print 'We had a diff'

	### Grab photos if any...
	getPhotos()
