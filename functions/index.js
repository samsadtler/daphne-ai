
//Node Modules

require('dotenv').config()

var config = {
    apiKey: process.env.API_KEY,
    authDomain:process.env.AUTH_DOMAIN,
    databaseURL: process.env.DB_URL,
    projectId: process.env.PROJECT_ID,
    storageBucket: process.env.ST_BUCKET,
    messagingSenderId: process.env.MS_ID
    
};


const Assistant = require('actions-on-google').DialogflowApp;
const firebase = require("firebase");
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);



// Dialogflow Intent names
const PLAY_INTENT = 'play';
const END_INTENT = 'end';
const LEARN_INTENT = 'learn-intent';
const PERVIOUS = 'previous-intent'
// Contexts
const WELCOME_CONTEXT = 'welcome';
const DO_YOU_HAVE_A_FAVORITE_NUMBER = "do-you-have-a-favorite-number";
const LEARN_CONTEXT = 'learn-context';
const END_CONTEXT = 'end-context';

const GUESS_CONTEXT = 'guess';
const QUESTION_CONTEXT = 'question';
const LEARN_DISCRIM_CONTEXT = 'learn-discrimination';
const ANSWER_CONTEXT = 'answer';

// Context Parameters
const ID_PARAM = 'id';
const BRANCH_PARAM = 'branch';
const LEARN_THING_PARAM = 'learn-thing';
const GUESSABLE_THING_PARAM = 'guessable-thing';
const ANSWER_PARAM = 'answer';
const QUESTION_PARAM = 'question';
 
firebase.initializeApp(config);
var database = firebase.database()

exports.assistantlifequestions = functions.https.onRequest((request, response) => {
   // console.log('headers: ' + JSON.stringify(request.headers));
   // console.log('body: ' + JSON.stringify(request.body));
   
   const assistant = new Assistant({request: request, response: response});

   let actionMap = new Map();
   actionMap.set(PLAY_INTENT, playIntent);
   actionMap.set(LEARN_INTENT, learnIntent);
   actionMap.set(END_INTENT, endIntent )
   assistant.handleRequest(actionMap);
   
   function playIntent(assistant) {

     console.log("############ playIntent ############")
      var inputSpeech = assistant.getRawInput()
      
      const parameters = {};   

     return getRecentCounter(assistant).then((counter) => {  
        storeRecentAnswer(inputSpeech , counter) 
        return getQuestions(assistant, counter)
      }, (error) => {
        return log('error', error)
      })
      
      // console.log('getIntent -->' + JSON.stringify(assistant.getIntent()));
      // console.log('getContext -->' + JSON.stringify(assistant.getContext()));
      // assistant.setContext(LEARN_CONTEXT, 5, parameters);
      // assistant.ask(speech);
      
  }

  function endIntent(assistant) {
      const parameters = {}; 
      log(endIntent);
      resetRecentCounter(0);
      const speech = `<speak> Alexa, ask me about life. </speak>`;
      assistant.tell(speech); 
  }

 function getRecentCounter(assistant){
    return admin.database().ref("questions-counter/c1").once("value").then( (snapshot) => {
        var value = snapshot.val();
        log('counter value' , value);
        return value
      }, (error) => {
        console.log("The read failed: " + error.code);
    });
  }

  function getQuestions(assistant, counter){
    return admin.database().ref("questions/q" + counter).once("value").then( (snapshot) => {
        var question = snapshot.val();
        log('question value' , question)
        if (question === null){
          resetRecentCounter(0)
          return playIntent(assistant)
        } else {
           return askQuestion(assistant, question, counter)
        }
      }, (error) => {
        console.log("The read failed: " + error.code);
    });
  }
  function askQuestion(assistant, value, counter){
        console.log('trying to ask a question'+ JSON.stringify(value));
        storeRecentCounter(counter);
        const speech = `<speak> Alexa,  ${value}</speak>`;
        assistant.ask(speech); 
  }

  function storeRecentQuestion(question, counter){
    var db = admin.database();
    var ref = db.ref("previous-question/")
    var newQuestionRef = ref.push();
    newQuestionRef.set(question);
  }

  function storeRecentCounter(counter){
    log("counter in " , counter);
    var db = admin.database();
    var ref = db.ref("questions-counter")
    var counterIncriment = 1;
  
    var updates = {};
    
    if(counter !== null){
      counter = parseInt(counter, 10);
      counterIncriment = counter+1;
    } else {
      counterIncriment = 0;
    }
    updates['/questions-counter/c1'] = counterIncriment;
    return admin.database().ref().update(updates);
  }

  function resetRecentCounter(counter){
    console.log("resetRecentCounter");
    var db = admin.database();
    var ref = db.ref("questions-counter")
    var updates = {};
    updates['/questions-counter/c1'] = counter;
    return admin.database().ref().update(updates);
  }

  function storeRecentAnswer(answer, counter){
    var db = admin.database();
    var ref = db.ref("answers/")
    var newQuestionRef = ref.push();
     newQuestionRef.set(answer);
  }




  //SUDO Code: indicates when it is time for Alexa and Google to learn a new response and intent 
  function learnIntent(assistant) {
      console.log("############ learnIntent ############")
      const parameters = {};
      var inputSpeech = assistant.getRawInput();

      console.log('getIntent -->' + JSON.stringify(assistant.getIntent()));
      console.log('getContextArgument -->' + JSON.stringify(assistant.getContextArgument(DO_YOU_HAVE_A_FAVORITE_NUMBER, PERVIOUS)));
      console.log('getIntent -->' + JSON.stringify(assistant.getIntent()));
      
      // parameters[PERVIOUS] = assistant.getContextArgument(DO_YOU_HAVE_A_FAVORITE_NUMBER, PERVIOUS));
      getRecentCounter(assistant)
      // const speech = `<speak> But, ${previousLifeQuestion}? </speak>`;

      //this essentially end the interaction
      // assistant.setContext(LEARN_CONTEXT, 5, parameters);
      // assistant.ask(speech);
      
      
   }
   // SUDO Code: designed to catch all questions and responses from Alexa so that there is a history contest for follow up questions when the answers are unknown. Ideally this will function as a memory base for google home


   function learnThing(assistant) {
       const priorQuestion = assistant.getContextArgument(QUESTION_CONTEXT, ID_PARAM).value;
       const guess = assistant.getContextArgument(GUESS_CONTEXT, ID_PARAM).value;
       const branch = assistant.getContextArgument(GUESS_CONTEXT, BRANCH_PARAM).value;
       const new_thing = assistant.getArgument(GUESSABLE_THING_PARAM);

       console.log(`Priorq: ${priorQuestion}, guess: ${guess}, branch: ${branch}, thing: ${new_thing}`);

       const q_promise = graph.child(priorQuestion).once('value');
       const g_promise = graph.child(guess).once('value');
       // Promise.all([q_promise, g_promise]).then(results => {
       //     const q_snap = results[0];
       //     const g_snap = results[1];

       //     const speech = `
       //      I need to know how to tell a ${new_thing} from a ${g_snap.val().a} using a yes-no question.
       //      The answer must be "yes" for ${new_thing}. What question should I use?
       //      `;

       //      const discrmParameters = {};
       //      discrmParameters[LEARN_DISCRIMINATION_PARAM] = true;
       //      assistant.setContext(LEARN_DISCRIM_CONTEXT, 2, discrmParameters);

       //      const answerParameters = {};
       //      answerParameters[ANSWER_PARAM] = new_thing;
       //      assistant.setContext(ANSWER_CONTEXT, 2, answerParameters);

       //      assistant.ask(speech);
       // });
   }

   function learnDiscrimination(assistant) {
       const priorQuestion = assistant.getContextArgument(QUESTION_CONTEXT, ID_PARAM).value;
       const guess = assistant.getContextArgument(GUESS_CONTEXT, ID_PARAM).value;
       const branch = assistant.getContextArgument(GUESS_CONTEXT, BRANCH_PARAM).value;
       const answer =  assistant.getContextArgument(ANSWER_CONTEXT, ANSWER_PARAM).value;
       const question = assistant.getArgument(QUESTION_PARAM);

       console.log(`Priorq: ${priorQuestion}, answer: ${answer}, guess: ${guess}, branch: ${branch}, question: ${question}`);

       const a_node = graph.push({
           a: answer
       });

       const q_node = graph.push({
           q: `${question}?`,
           y: a_node.key,
           n: guess
       });

       let predicate = 'a';
       if (['a','e','i','o','u'].indexOf(answer.charAt(0)) !== -1) {
           predicate = 'an';
       }

       const update = {};
       update[branch] = q_node.key;
       // graph.child(priorQuestion).update(update).then(() => {
       //     // TODO codelab-2: give the user an option to play again or end the conversation
       //     const speech = "Ok, thanks for the information!";
       //     assistant.ask(speech);
       // });
   }
   function log(text, value){
      return console.log(text + " -(-)-(-)-> " + JSON.stringify(value))
  }
});



