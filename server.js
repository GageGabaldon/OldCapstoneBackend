// Load in the appropriate libraries
let https = require("https");
let url = require("url");
let mysql = require("mysql");
let fs = require("fs");
let validItems = ['user', 'pantry', 'site', 'box', 'recipe'];
let validMethods = ['GET', 'POST', 'DELETE', 'PUT'];

const options = {
    key: fs.readFileSync('keys/server/key.pem'),
    cert: fs.readFileSync('keys/server/cert.pem')
};

https.createServer(options, async function(request, response)
{
    console.log("request recieved\n");

    /*
    Function: sendQuery
    Arguments: query (formatted MySQL query)
    Description: this function takes care of all communication with the database.
                 requires a valid MySQL query to work properly.
    Return: returns the results of the MySQL query as an object, or an object containing an error code and a brief
            description of the problem if an error was encountered.
    */
    async function sendQuery(query)
    {
        console.log("sendquery method entered\n");
        let result = {code: 500, message: "An unexpected error occurred", content: []};
        let dbcon = mysql.createConnection
        ({
            host: "23.254.161.117",
            user: "customer",
            password: "FridgefillerCustomer",
            database: "FridgeFiller",
            debug: true
            /*
            ssl:
                {
                    CA: fs.readFileSync('keys/database/ca.pem'),
                    dbKey: fs.readFileSync('keys/database/server-key.pem'),
                    dbCert: fs.readFileSync('keys/database/server-cert.pem')
                }*/
        });

        let x  = response;

        return new Promise(function(resolve)
        {
            let localResult = {};

            dbcon.query(query, function (dberr, dbResult, fields)
            {
                if (dberr)
                {
                    // return an error code and a message in an object
                    localResult.mode = 500;
                    localResult.message = "Database Query Failed";

                    console.log("Database query failed, exiting\n");

                    resolve(localResult);
                }

                localResult.code = 200;
                localResult.message = "Database Query Successful";
                localResult.content = dbResult;

                console.log("Database query successful\n");

                dbcon.end(function(err)
                {
                    if(err)
                    {
                        console.log("Database connection could not be ended\n");
                        resolve(localResult);
                    }

                    console.log("Database connection closed, exiting\n");
                });

                resolve(localResult);
            });
        });
    }



    /*
    Function: sendResult
    Arguments: funcResult (expected to be result object from sendQuery)
    Description: this function packages and sends the results of a database query made in the
                 sendQuery function back to the device that requested it.
    Return: none
    */
    function sendResult(funcResult)
    {
        // check if an error code is present
        if(funcResult.code !== 200)
        {
            response.writeHead(funcResult.code, funcResult.message);
            response.end();

            console.log("Error Encountered\n")
        }
        else
        {
            response.writeHead(200, "Database query successful");
            response.write(JSON.stringify(funcResult.content));
            response.end();
            console.log("No error encountered, response written\n");
        }

        console.log("Request processed\n");
    }



    /*
        Function: checkTermValid
        Arguments: pathName (String)
        Description: This function checks the string provided against an array of valid terms. If the string provided
                     is in the list, then the function returns true. If not, the function returns false.
        Return: a boolean value that dictates if the term provided in pathName is valid or not
    */
    function checkTermValid(pathName)
    {
        // use a regex to remove any slashes
        pathName = pathName.replace(/(\\|\/)/g, '');

        let termIsValid = false;
        validItems.forEach(function(curr)
        {
            if(pathName === curr)
            {
                termIsValid = true;
            }
        });

        return termIsValid;
    }


    // start server logic
    console.log("provided url is "+ request.url +'\n');

    let query = new url.URL(request.url, 'https://${request.headers.host}');
    let dbQuery = "";
    let resultMessage = {code: 500, message: "An unexpected error occurred", content: []};

    console.log("Request recieved\n");

    // first, check to see if the method is valid
    if(validMethods.includes(request.method))
    {
        // if the method is valid, check the specified pathname to make sure it is valid
        if(checkTermValid(query.pathname))
        {
            switch (request.method)
            {
                case "GET":
                    // check the path name for the requested resource
                    console.log("request type: GET, pathname is " + query.pathname + '\n');
                    switch (query.pathname)
                    {
                        case "/user":
                            // if request is for user information, check query contents to make sure necessary items are present
                            console.log("user case entered, query is " + query.searchParams + '\n');

                            // TODO: CHECK FOR AUTH CODE WHEN AUTH SERVER IMPLEMENTED
                            /*&& "authcode" in query*/
                            if (query.searchParams.has("uid"))
                            {
                                console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true)
                                {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbquery
                                    dbQuery = "SELECT userName, userPhone, userEmail FROM User where userID = " + query.searchParams.get("uid");
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                                else if (false)
                                {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            // TODO: add login case for email/maybe phone number
                            else
                            {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/pantry":
                            if (query.searchParams.has("uid"))
                            {
                                console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true)
                                {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbQuery
                                    dbQuery = "SELECT Pantry_foodID, Pantry_foodName, Pantry_foodUPC FROM User_has_Pantry where User_userID = " + query.searchParams.get("uid");
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                                else if (false)
                                {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            else
                            {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/sites":
                            // if request is for distribution sites/snap retailers, check query contents
                            if("city" in query)
                            {
                                if("county" in query || "state" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "SELECT * FROM DistributionSites WHERE siteCity = " + query.searchParams.get("city");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("county" in query)
                            {
                                if("city" in query || "state" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "SELECT * FROM DistributionSites WHERE siteCounty = " + query.searchParams.get("county");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("state" in query)
                            {
                                if("county" in query || "city" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "SELECT * FROM DistributionSites WHERE siteState = " + query.searchParams.get("state");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("zip" in query)
                            {
                                if("county" in query || "state" in query || "city" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "SELECT * FROM DistributionSites WHERE siteZip = " + query.searchParams.get("zip");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else
                            {
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/recipe":
                            // if request is for recipes, check query contents

                            // TODO: NEED TO FIGURE OUT THE LOGIC FOR THIS

                            if("uid" in query)
                            {
                                // if the query wants recipes that a certain user can use given their pantry contents
                            }
                            else if("searchby" in query)
                            {
                                // if the query specifies a search term
                            }


                            else if("cuisine" in query)
                            {
                                // if the query wants recipes of a certain cuisine
                            }
                            else if("sortby" in query)
                            {
                                // if the query wants all recipes returned in a certain order
                            }
                            else
                            {
                                // if none of the above identifiers are present, send back 400 bad request

                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term missing or not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/box":
                            // if request is for food boxes, check query contents
                            if("boxtype" in query)
                            {
                                dbQuery = "";

                                sendQuery(dbQuery).then(sendResult);
                            }
                            else
                            {
                                // if box type identifier is not present, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }

                            break;
                    }

                    break;
                case "POST":
                    // post logic goes here
                    switch (query.pathname)
                    {
                        case "/user":

                            break;
                        case "/pantry":

                            break;
                        case "/recipe":

                            break;
                        case "/box":

                            break;
                        case "/site":

                            break;
                    }


                    break;
                case "DELETE":
                    // delete logic goes here
                    switch (query.pathname)
                    {
                        case "/user":
                            // 
                            console.log("user case entered (used for DELETE), query is " + query.searchParams + '\n');

                            // TODO: CHECK FOR AUTH CODE WHEN AUTH SERVER IMPLEMENTED
                            /*&& "authcode" in query*/
                            if (query.searchParams.has("uid"))
                            {
                                console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true)
                                {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbquery
                                    dbQuery = "DELETE FROM User where userID = " + query.searchParams.get("uid");
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                                else if (false)
                                {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            // TODO: add login case for email/maybe phone number
                            else
                            {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/pantry":
                            //
                            console.log("pantry case entered (used for DELETE), query is " + query.searchParams + '\n');

                            if (query.searchParams.has("uid"))
                            {
                                console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true)
                                {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbQuery
                                    dbQuery = "DELETE FROM User_has_Pantry where User_userID = " + query.searchParams.get("uid");
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                                else if (false)
                                {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            else
                            {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/recipe":

                            break;
                        case "/box":
                            if("boxtype" in query)
                            {
                                dbQuery = "DELETE FROM Boxes_has_Ingredients where Boxes_boxID = " + query.searchParams.get("uid");

                                sendQuery(dbQuery).then(sendResult);
                            }
                            else
                            {
                                // if box type identifier is not present, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/site":
                            // if request is for distribution sites/snap retailers, check query contents
                            if("city" in query)
                            {
                                if("county" in query || "state" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "DELETE FROM DistributionSites WHERE siteCity = " + query.searchParams.get("city");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("county" in query)
                            {
                                if("city" in query || "state" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "DELETE FROM DistributionSites WHERE siteCounty = " + query.searchParams.get("county");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("state" in query)
                            {
                                if("county" in query || "city" in query || "zip" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "DELETE FROM DistributionSites WHERE siteState = " + query.searchParams.get("state");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else if("zip" in query)
                            {
                                if("county" in query || "state" in query || "city" in query)
                                {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                }
                                else
                                {
                                    // build query
                                    dbQuery = "DELETE FROM DistributionSites WHERE siteZip = " + query.searchParams.get("zip");
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            }
                            else
                            {
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }

                            break;
                    }

                    break;
                case "PUT":
                    // put logic goes here
                    switch (query.pathname)
                    {
                        case "/user":

                            break;
                        case "/pantry":

                            break;
                        case "/recipe":

                            break;
                        case "/box":

                            break;
                        case "/sites":

                            break;
                    }
                    break;
            }
        }
        else
        {
            // else, the pathname is not valid, send back 400 Bad Request
            resultMessage.code = 400;
            resultMessage.message = "Provided resource name is not valid";
        }
    }
    else
    {
        // else, the method is not valid, send back 501 Not Implemented
        resultMessage.code = 501;
        resultMessage.message = "Method " + request.method + " is not valid or not implemented";
    }


}).listen(8080);