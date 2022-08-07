// Habitica API: https://habitica.com/apidoc/
// Google Calendar API: https://developers.google.com/apps-script/reference/calendar/calendar-app

const today = new Date(); // new Date object for today's date

// Hidden information
  const CALENDAR_NAME = "calendar ID here"; // SETTING: calendar ID
  const HABITICA_TOKEN = "Habitica API token"; // SETTING: Habitica API token
  const HABITICA_ID = "Habitica user ID"; // SETTING: Habitica user ID
  const CALENDAR_TAG_ID = "Calendar tag ID"; // SETTING: Calendar name tag ID from Habitica, delete if not used

  const habTaskURLToDos = "user?type=todos";
  var hasDescription = false;

// Sync Calendar events to Habitica
function syncToHabitica() {
  const habTaskURL = "https://habitica.com/api/v3/tasks/"; // Habitica task URL
  const habTagsURL = "https://habitica.com/api/v3/tags/" // Habitica tags URL

  const dateToCheck = new Date(); // new Date object 
  const numDaysAhead = 1; // SETTING: number of days in advance events should be added
  dateToCheck.setDate(dateToCheck.getDate() + numDaysAhead); // calculates the formatted date based on numDaysAhead and changes the dateToCheck object
  //const agenda = CalendarApp.getCalendarsByName(CALENDAR_NAME)[0]; // sets the calendar to CALENDAR_NAME
  const agenda = CalendarApp.getCalendarById(CALENDAR_NAME); // sets the calendar to CALENDAR_NAME
  const calendarNameStr =  agenda.getName();
  const events = agenda.getEventsForDay(dateToCheck); // gets events for the dateToCheck

  //console.log(agenda);
  //console.log(20, events[0]); 

  // Template request parameters 
  const templateParams = {
    _post: {
      method: "post",
      headers: { "x-api-user": HABITICA_ID, "x-api-key": HABITICA_TOKEN, "Content-Type": "application/json" },
      muteHttpExceptions: true
    },
    _get: {
      contentType: "application/json",
      method: "get",
      headers: { "x-api-user": HABITICA_ID, "x-api-key": HABITICA_TOKEN, "Content-Type": "application/json" },
      muteHttpExceptions: true
    },
    _delete: {
      method: "delete",
      headers: { "x-api-user": HABITICA_ID, "x-api-key": HABITICA_TOKEN, "Content-Type": "application/json" },
      muteHttpExceptions: true
    },
  };

  // Get completed Habitica tasks
  const newTasks = [];
  const existingTasks = fetchExistingTasks(habTaskURL, templateParams);
    // console.log("fetchTodayCompletedTasks error start"); // DEBUG: existingTasks
    // Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
    // console.log("fetchTodayCompletedTasks error end"); // DEBUG: existingTasks
  const completedTasksContent = fetchTodayCompletedTasks(
    habTaskURL,
    templateParams,
    today
  );
    // console.log("completedTasksContent error start"); // DEBUG: completedTasksContent
    // Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
    // console.log("completedTasksContent error end"); // DEBUG: completedTasksContent

  // // Delete calendar events that have been completed in Habitica
  // deleteCalendarTasks(habTaskURL, existingTasks, templateParams);

  // Gets Habitica tags
  function fetchExistingTags(habTagsURL, templateParams) {
    const response = UrlFetchApp.fetch( 
      habTagsURL,
      templateParams._get
    ); // gets response of request
      console.log("fetchExistingTags error start"); // DEBUG: fetchExistingTags 
      Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
      console.log("fetchExistingTags error end"); // DEBUG: fetchExistingTags
    return JSON.parse(response.getContentText());
  }
  const existingTags = fetchExistingTags(habTagsURL, templateParams); // existing tags 

  // For each event found
  for (i = 0; i < events.length; i++) {
    if (newTasks.indexOf(events[i].getTitle()) === -1) {
      newTasks.push(events[i].getTitle());
      var currentEvent = events[i];

      // Gets description text from Calendar event description, if specified in the following format: "Description: Some text here;"
      const calDescription = events[i].getDescription(); // raw Calendar description, returns a string
      var description = ""; // formatted description text
      hasDescription = false; // whether or not the description text is specified in the Calendar event
      function getDescriptionFormatted(){
        if (calDescription.includes("Description: ") == true){
          hasDescription = true; 
          var descriptionStartIndex = calDescription.indexOf("Description: ") + 2; // start index of description
          var descriptionLength = calDescription.length - 1; // last index of description
          var descriptionCut = calDescription.substring(descriptionStartIndex, descriptionLength); // substring of everything after "Description: "
          var descriptionCutLastIndex = descriptionCut.indexOf(";"); // cuts the rest of the string after the first ";"
          description = descriptionCut.substring(12, descriptionCutLastIndex); 
          
          // Removes a href text formatting from description if it contains a link
          var linkCleanComplete = false;
          for (var l = 0; linkCleanComplete == false; l++){
            if (description.includes("<a href") == true) {
              var ahrefStart = description.indexOf("<a href");
              var ahrefEnd = description.indexOf(">");
              var firstHalf = description.substring(0, ahrefStart);
              var secondHalf = description.substring(ahrefEnd + 1, description.length + 1);
              description = firstHalf + secondHalf;

              var aStart = description.indexOf("</a>");
              var aEnd = description.indexOf(">");
              var aFirstHalf = description.substring(0, aStart);
              var aSecondHalf = description.substring(aEnd + 1, description.length + 1);
              description = aFirstHalf + aSecondHalf;
            } else {
              linkCleanComplete = true; // ends the loop
            }
          }
          return description;
        } else {
          return "";
        }
      }
      getDescriptionFormatted()

      // Gets difficulty from Calendar event description, if specified, using the following format: "Difficulty: Medium;"
      var difficulty = 1; // default difficulty, if none is specified
      function setDifficulty() {
        if (calDescription.includes("Difficulty: Trivial") == true) {
          difficulty = 0.1;
          return difficulty;
        } else if (calDescription.includes("Difficulty: Easy") == true) {
          difficulty = 1;
          return difficulty;
        } else if (calDescription.includes("Difficulty: Medium") == true) {
          difficulty = 1.5;
          return difficulty;
        } else if (calDescription.includes("Difficulty: Hard") == true) {
          difficulty = 2;
          return difficulty;
        } else {
          return difficulty;
        }
      }

      // Gets attribute to add points to from Calendar event description, if specified using the following format: "Attribute: Str;"
      var attribute = "str"; // default attribute, if none is specified
      function setAttribute() {
        if (calDescription.includes("Attribute: Str") == true) {
          attribute = "str";
          return attribute;
        } else if (calDescription.includes("Attribute: Int") == true) {
          attribute = "int";
          return attribute;
        } else if (calDescription.includes("Attribute: Per") == true) {
          attribute = "per";
          return attribute;
        } else if (calDescription.includes("Attribute: Con") == true) {
          attribute = "con";
          return attribute;
        } else {
          return attribute;
        }
      }

      // Gets checklist items from Calendar event description, if specified in the following format: "Checklist: Item 1, Another item, Item 3, etc;"
      var checklist = []; // formatted checklist text
      var hasChecklist = false; // whether or not the checklist text is specified in the Calendar event
      function getChecklist(){
        if (calDescription.includes("Checklist: ") == true){
          hasChecklist = true; 
          var checklistStartIndex = calDescription.indexOf("Checklist: ") + 11; // start index of checklist
          var checklistLength = calDescription.length + 1; // last index of description text
          var checklistCut = calDescription.substring(checklistStartIndex, checklistLength); // substring of everything after "Checklist: "
          var checklistCutLastIndex = checklistCut.indexOf(";"); 
          var checklistCutStr = checklistCut.substring(0, checklistCutLastIndex); //cuts the rest of the string after the first ";"
          var checklistCut = checklistCut.substring(0, checklistCutStr.length); // comma separated list of checklist items

          // Removes a href text formatting from description if it contains a link
          var linkCleanComplete = false;
          for (var l = 0; linkCleanComplete == false; l++){
            if (checklistCut.includes("<a href") == true) {
              var ahrefStart = checklistCut.indexOf("<a href");
              var ahrefEnd = checklistCut.indexOf(">");
              var firstHalf = checklistCut.substring(0, ahrefStart);
              var secondHalf = checklistCut.substring(ahrefEnd + 1, checklistCut.length + 1);
              checklistCut = firstHalf + secondHalf;

              var aStart = checklistCut.indexOf("</a>");
              var aEnd = checklistCut.indexOf(">");
              var aFirstHalf = checklistCut.substring(0, aStart);
              var aSecondHalf = checklistCut.substring(aEnd + 1, description.length + 1);
              checklistCut = aFirstHalf + aSecondHalf;
            } else {
              linkCleanComplete = true; // ends the loop
            }
          }

          // Format the checklist array for Habitica
          var checklistArray = checklistCut.split(", "); // array of checklist items
            // console.log("checklistArray: " + checklistArray); // DEBUG: checklist array
          for (var c = 0; c < (checklistArray.length); c++) {
            checklist[c] = {"text": checklistArray[c],"completed": false}
          }
          
            // console.log("checklistArrayFormatted: " + checklist); // DEBUG: checklist
          return checklist; 
        } else {
          return "";
        }
      }
      getChecklist();

      // Tags task with the Calendar's name, delete if not used
      function getTags(){
        var tagsList = CALENDAR_TAG_ID; 
      return tagsList;
      }
      // getTags();

      const params = templateParams._post;
      if (hasChecklist == true) {
        // Posts Calendar event to Habitica as a To Do
        var payloadData = {
          "text": ":calendar: " + events[i].getTitle(), // task title
          "notes": createTaskNote(currentEvent, events[i].isAllDayEvent(), events[i].getStartTime(), events[i].getEndTime(), events[i].getLocation(), getDescriptionFormatted()), // task description
          "type": "todo", // task type
          "priority": setDifficulty(), // task difficulty
          "date": dateToCheck.toString(), // task date
          "attribute": setAttribute(), // task attribute 
          "tags": getTags(), // task tags
          "checklist": getChecklist() // task checklist
        }
      } else {
        // Posts Calendar event to Habitica as a To Do
        var payloadData = {
          "text": ":calendar: " + events[i].getTitle(), // task title
          "notes": createTaskNote(currentEvent, events[i].isAllDayEvent(), events[i].getStartTime(), events[i].getEndTime(), events[i].getLocation(), getDescriptionFormatted()), // task description
          "type": "todo", // task type
          "priority": setDifficulty(), // task difficulty
          "date": dateToCheck.toString(), // task date
          "attribute": setAttribute(), // task attribute 
          "tags": getTags(), // task tags
        }
      }
      params["payload"] = JSON.stringify(payloadData);

      console.log("params: ", params); // DEBUG: params 

      const paramsText = completedTasksContent.indexOf(params.payload.text);

      // Checks if completed task content is the same as the new task
      if (completedTasksContent.indexOf(params.payload.text) === -1) {
        var response = UrlFetchApp.fetch(habTaskURL + "user", params); // gets response of request
          console.log("completedTasksContent error start"); // DEBUG: completedTasksContent
          Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
          console.log("completedTasksContent error end"); // DEBUG: completedTasksContent
      }
    }
  }
}

// Get existing Habitica tasks, returns content text
function fetchExistingTasks(habTaskURL, templateParams) {
  const response = UrlFetchApp.fetch( 
    habTaskURL + habTaskURLToDos,
    templateParams._get
  ); // gets response of request
  // console.log("fetchExistingTasks error start"); // DEBUG: fetchExistingTasks
  // Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
  // console.log("fetchExistingTasks error end"); // DEBUG: fetchExistingTasks
  return JSON.parse(response.getContentText());
}

// // Delete Calendar tasks 
// function deleteCalendarTasks(habTaskURL, habTasks, templateParams) {
//   for (j = 0; j < habTasks.data.length; j++) {
//     if (habTasks.data[j].text.indexOf(":calendar: ") > -1) {
//       UrlFetchApp.fetch(
//         habTaskURL + habTasks.data[j].id,
//         templateParams._delete
//       );
//     }
//   }
// }

// Get Habitica completed tasks, returns content text
function fetchTodayCompletedTasks(habTaskURL, templateParams, dateToCheck) {
  const tasksContent = [];
  const response = UrlFetchApp.fetch(
    habTaskURL + habTaskURLToDos,
    templateParams._get
  ); // gets results of request
    // console.log("fetchTodayCompletedTasks error start"); // DEBUG: fetchTodayCompletedTasks
    // Logger.log(response.getContentText()); // DEBUG: Logs full errors messages to console
    // console.log("fetchTodayCompletedTasks error end"); // DEBUG: fetchTodayCompletedTasks
  const tasks = JSON.parse(response.getContentText());

  for (i = 0; i < tasks.data.length; i++) {
    if (tasks.data[i].text.indexOf(":calendar: ") > -1) {
      const taskDate = new Date(tasks.data[i].createdAt).getDate();
      if (taskDate + 12 !== today.getDate()) {
        tasksContent.push(tasks.data[i].text);
      }
    }
  }
  return tasksContent;
}

// Fill in a Habitica task description
var locationFormatted = "";
var descriptionFormatted = "";
function createTaskNote(currentEvent, isAllDay, startTime, endTime, location, description) {
  // Sets location text, if specified
  if (location != ""){
    locationFormatted = "**Location**: " + location + "  \n";
  }
  // Sets description text, if specified
  if (hasDescription == true) {
    descriptionFormatted = "**Description:** " + "  \n" + description;
  }

  // Returns formatted text for Habitica task description
  if (isAllDay == true) {
    return "**End**: " + currentEvent.getAllDayEndDate() + "  \n" + locationFormatted + descriptionFormatted;
  } else {
    return "**Start**: " + startTime + "  \n" + "**End**: " + endTime + "  \n" + locationFormatted + descriptionFormatted;
  }
}







