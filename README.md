fbThreadArchiver
================

Ever wanted to track the life of a facebook thread?

Maybe you want to show your friends some derpy comment action.

Either way, now you can!

## Steps
1. Get yourself an appropriate API token for facebook ([this](http://www.slickremix.com/facebook-60-day-user-access-token-generator/1/) should be a good place to get you started if you don't already have your own system for creating tokens). Stick this in `apiKey.txt`

1. Create a file called `watchThreads.json`. In it, create an object representing the threads you want to watch and give them a title. Format is as so:
```
{
	"1234": "Call this whatever you want",
	"5678": "Remember that the key is the ID of the thread you want to watch"
}
```

1. Run `grabThread.py`. Assuming things are kosher (for example, you actually have the right permissions setup when you generated the API token and you have access to the thread normally), it should grab your dataz.

1. To view said dataz, point your browser to the location of wherever you have this handy little utility stashed and enjoy. If there are changes, click on the revision count to get the previous versions. Click on the revision date (which is really just when the script was ran and detected a change) to see the old version. Click the main title to get the 'current' version.
