const express = require('express');
const Request = require('request');
const fs = require('fs');
var oauth = require('oauth');
var download = require('download');
const app = express();
const Json2csvParser = require('json2csv').Parser;
const dotenv = require('dotenv');
require('dotenv').config();
const port = process.env.PORT;
var mysql = require('mysql');

var connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

connection.connect(function(err) {if (err) throw err;});


oauth = new oauth.OAuth( 'https://api.twitter.com/oauth/request_token'
                          	, 'https://api.twitter.com/oauth/access_token'
                          	, '**********************'
                          	, '**********************'
                          	, '1.0A'
                          	, null
                          	, 'HMAC-SHA1' );

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: true }));


app.set('view engine', 'ejs')
app.use(express.static('public'));

app.get('/', function (request, response) {
  response.render('index')
})


app.post('/', function (request, response) {
  let username = request.body.textusername;
  let query = request.body.texthashtag;
  let redquery = request.body.redditsearchtext;
  let button1 = request.body.buttonusername;
  let button2 = request.body.buttonhashtag;
  let button3 = request.body.redditsearchbutton;

    var tweet_data = {
      tweet_content : []
    }

    var hash_data = {
      hash_content : []
    }

    var thread_data = {
      thread_content : []
    }

function getAllThreads() {
  
Request.get('https://www.reddit.com/search.json?q='+redquery+'&sort=new/'
      ,function (e, data, body) {
    if(e) console.error(e);
    var output = JSON.parse(body);
    const j = output.data.children.length;
    console.log("The number of threads"+j);
    for (var i = 0; i < j; i++) 
    {
    if(output.data.children[i].data.selftext_html !== null)
    {
      var temp_fulltext = output.data.children[i].data.selftext_html;
    }
    var temp_ups = output.data.children[i].data.ups;
    var temp_title = output.data.children[i].data.title;
    var temp_author = output.data.children[i].data.author;
    var temp_timestamp = output.data.children[i].data.created_utc;
    var temp_subreddit = output.data.children[i].data.subreddit_name_prefixed;
    var temp_url = output.data.children[i].data.url;

    var new_reddit_data  =  {
      
      subreddit : temp_subreddit,
      reddit_author : temp_author,
      reddit_title : temp_title,
      reddit_fulltext : temp_fulltext,
      reddit_ups : temp_ups,
      reddit_url : temp_url,
      reddit_timestamp : temp_timestamp
    }

    thread_data.thread_content.push(new_reddit_data);

  }
  response.render('index', {thread_data_full : thread_data , thread_count : j});
});
}

  function getTweetsByUsername(){
    oauth.get( 'https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name=' + username + '&tweet_mode=extended&count=3400&exclude_replies=true&include_rts=false'
            , '**********************'
            , '**********************'
            , function (e, data, result){

          if (e) console.error(e);
          var output = JSON.parse(data);
          var j = Object.keys(output).length;
          //console.log(i);
          for (var i=0;i<j;i++)
          {
            var temp_tweet_text = output[i].full_text;
            var temp_tweet_id = output[i].id_str;
            var  temp_tweet_url = "https://twitter.com/"+username+"/status/"+temp_tweet_id+"/";

            var new_tweet_data  =  {

              tweet_username : username,
              tweet_text : temp_tweet_text ,
              tweet_url : temp_tweet_url ,
              count : i,
              total_tweets : j
            };
            tweet_data.tweet_content.push(new_tweet_data);
            //console.log(new_tweet_data);

          }

          //response.json(tweet_data);
          response.render('index', {tweet_data_full : tweet_data , count : j});

            console.log("Connected!");
            var create_table = "CREATE TABLE IF NOT EXISTS "+username+" (id int primary key AUTO_INCREMENT, text VARCHAR(2083), url VARCHAR(2083), instance int)";
            
            connection.query(create_table, function (err, result) {
              if (err) console.log(err);
              console.log("Table created");
            });

            for (var i = 0; i < j; i++) {
            var cleaned_tweet_text = tweet_data.tweet_content[i].tweet_text;
            var newdataresult;
            newdataresult = cleaned_tweet_text.replace(/'/g, "");

            var sql = "INSERT INTO "+username+" (id, text, url, instance) VALUES ('0','"+newdataresult+"', '"+tweet_data.tweet_content[i].tweet_url+"', '"+tweet_data.tweet_content[i].count+"')";
            
            connection.query(sql, function (err, result) {
              if (err) throw err;
              console.log(username+" record inserted");
            });
            }
          
        });


  }


function getTweetsByHashtag(){

  oauth.get( 'https://api.twitter.com/1.1/search/tweets.json?&q=%23'+ query +'&tweet_mode=extended&count=3400&exclude_replies=true&src=typd&result_type=recent'
    , '**********************'
    , '**********************'
    , function (e, data, result){

      if (e) console.error(e);
      var output = JSON.parse(data);
      var j = Object.keys(output.statuses).length;
      //console.log(j);
      for (var i=0;i<j;i++)
      {
        var temp_hash_text = output.statuses[i].full_text;
        var temp_hash_username = output.statuses[i].user.screen_name;
        var temp_hash_id = output.statuses[i].id_str;
        var  temp_hash_url = "https://twitter.com/"+temp_hash_username+"/status/"+temp_hash_id+"/";
        var new_hash_data  =  {
          hash_text : temp_hash_text,
          hash_username : temp_hash_username,
          hash_url : temp_hash_url,
          hash_id : temp_hash_id
        };


        hash_data.hash_content.push(new_hash_data);
        //console.log(temp_hash_id);
      }
      response.render('index', {hash_data_full : hash_data, hash_count : j});


            console.log("Connected!");
            var hash = "hash_"+query;
            var create_table = "CREATE TABLE IF NOT EXISTS "+hash+" (id int primary key AUTO_INCREMENT, text VARCHAR(2083), username VARCHAR(2083), status_id VARCHAR(2083), url VARCHAR(2083))";
            
            connection.query(create_table, function (err, result) {
              if (err) console.log(err);
              console.log("Table created");
            });

            for (var i = 0; i < j; i++) {
            var cleaned_tweet_text = hash_data.hash_content[i].hash_text;
            var newdataresult;
            newdataresult = cleaned_tweet_text.replace(/'/g, "");

            var sql = "INSERT INTO "+hash+" (id, text, username, status_id, url) VALUES ('0','"+newdataresult+"', '"+hash_data.hash_content[i].hash_username+"', '"+hash_data.hash_content[i].hash_id+"','"+hash_data.hash_content[i].hash_url+"')";
            
            connection.query(sql, function (err, result) {
              if (err) throw err;
              console.log(hash+" record inserted");
            });
            // console.log("Insert completed");
            }

    });
}

if (button1 == "ButtonResponseOne") {

  getTweetsByUsername();

} 
else
if (button2 == "ButtonResponseTwo") {

  getTweetsByHashtag();

}
else {
  getAllThreads();
  
}

})
app.listen(process.env.PORT, function () {
  console.log('Twiddit is on port '+port)
})
