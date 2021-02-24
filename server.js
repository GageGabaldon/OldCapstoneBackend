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
            user: "admin",
            password: "Fridgefiller2021",
            database: "FridgeFiller",
            debug: true,
            /*ssl:
                {
                    CA: fs.readFileSync('keys/database/ca.pem'),
                    dbKey: fs.readFileSync('keys/database/server-key.pem'),
                    dbCert: fs.readFileSync('keys/database/server-cert.pem')
                }*/
        });

        return new Promise(function(resolve, reject)
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

                    reject(localResult);
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
                        reject(localResult);
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



    // TODO: EXPAND THIS FUNCTION SO IT CAN BE USED BY MORE THAN THE RECIPE TABLE
    // do this by checking the resource name at query.pathname, have cases for each
    /*
        Function: formatSortBy
        Arguments: query (query object from parsed URL)
        Description: This function checks the query for sort terms, formats the necessary query string, and returns that string
        Return: a String that can be concatenated onto another query string to sort the query results. If the string is null, the
                sort term is invalid.
     */
    function formatSortBy(query)
    {
        let formatString = "";

        if(query.searchParams.get("sortby") === "rating")
        {
            formatString = " ORDER BY recipeRating";
        }
        else if("cooktime")
        {
            formatString = " ORDER BY timeToMake";
        }
        else if("popular")
        {
            formatString = " ORDER BY numRatings";
        }
        else if("cuisine")
        {
            formatString = " ORDER BY cuisineType";
        }

        return formatString;
    }


// TODO: REWRITE THIS FUNCTION DESCRIPTION
    /*
        Function: formatSortBy
        Arguments: query (query object from parsed URL)
        Description: This function checks the query for sort terms, formats the necessary query string, and returns that string
        Return: a String that can be concatenated onto another query string to sort the query results. If the string is null, the
                sort term is invalid.
     */
    function formatLimit(query)
    {
        let limitStr = "";

        if("limit" in query)
        {
            limitStr = " LIMIT " + query.searchParams.get("limit");
        }

        return limitStr;
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
                            else if("uemail" in query)
                            {
                                // get user information based on email
                                dbQuery = `SELECT userName, userPhone, userID FROM User WHERE userEmail = ${query.searchParams.get("uemail")};`;

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
                            }
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
                                // console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true)
                                {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbQuery
                                    // SELECT Ingredients_IngID, IngName, ingredientQuantity, ingredientUnit FROM Pantry INNER JOIN Pantry_has_Ingredients ON Pantry.pantryID INNER JOIN Ingredients ON Pantry_has_Ingredients.Ingredients_IngID WHERE Pantry.User_userID = 3 AND Pantry_has_Ingredients.Pantry_pantryID = Pantry.pantryID AND Pantry_has_Ingredients.Ingredients_IngID = Ingredients.IngID;

                                    let userID = query.searchParams.get("uid");
                                    dbQuery = `SELECT Ingredients_IngID, IngName, ingredientQuantity, ingredientUnit FROM Pantry INNER JOIN Pantry_has_Ingredients ON Pantry.pantryID INNER JOIN Ingredients ON Pantry_has_Ingredients.Ingredients_IngID WHERE Pantry.User_userID = ${userID} AND Pantry_has_Ingredients.Pantry_pantryID = Pantry.pantryID AND Pantry_has_Ingredients.Ingredients_IngID = Ingredients.IngID;`;
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
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
                            if("uid" in query)
                            {
                                // if the query wants recipes for a certain user
                                if("source" in query)
                                {
                                    if(query.searchParams.get("source") === "favorite")
                                    {
                                        // if the request is for recipes a user has favorited
                                        dbQuery = `SELECT recipeID, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes LEFT JOIN User_has_Recipes ON Recipes.recipeID = User_has_Recipes.Recipes_recipeID WHERE User_has_Recipes.User_userID = ${query.searchParams.get("uid")}`;

                                        if("sortby" in query)
                                        {
                                            // if the query wants user favorite recipes sorted in a certain way

                                            let formatString = formatSortBy(query);

                                            if(formatString !== "")
                                            {
                                                dbQuery.concat(formatString);
                                            }
                                            else
                                            {
                                                // else, return 400 Bad Request

                                                resultMessage.code = 400;
                                                resultMessage.message = "Request not valid, search term missing or not valid";

                                                sendResult(resultMessage);
                                            }
                                        }

                                        if("limit" in query)
                                        {
                                            let formatString = formatLimit(query);

                                            dbQuery.concat(formatString);
                                        }

                                        dbQuery.concat(";");

                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    }
                                    else if(query.searchParams.get("source") === "pantry")
                                    {
                                        // if the request is for recipes a user can make with their pantry contents
                                        // TODO: IMPLEMENT THIS QUERY
                                        /*
                                         1. get ingredients for a specific pantry in Pantry_has_Ingredients
                                         2. join Pantry_has_Ingredients with Recipe_has_Ingredients on ingredient numbers
                                         3. join Recipes with Recipe_has_Ingredients on recipeID
                                         4.
                                         */
                                        dbQuery = "";

                                        if("sortby" in query)
                                        {
                                            // if the query wants pantry-specific recipes sorted in a certain way
                                            let formatString = formatSortBy(query);

                                            if(formatString !== "")
                                            {
                                                dbQuery.concat(formatString);
                                            }
                                            else
                                            {
                                                // else, return 400 Bad Request

                                                resultMessage.code = 400;
                                                resultMessage.message = "Request not valid, search term missing or not valid";

                                                sendResult(resultMessage);
                                            }
                                        }
                                    }
                                    else
                                    {
                                        // if neither case is true, send 400 Bad Request
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request not valid, search term missing or not valid";

                                        sendResult(resultMessage);
                                    }

                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                }
                                else
                                {
                                    // else, send back 400 Bad Request

                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, search term missing or not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            else if("searchby" in query)
                            {
                                // if the query specifies a search term
                                dbQuery = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE recipeName LIKE ${query.searchParams.get("searchby")}`;

                                if("sortby" in query)
                                {
                                    // if the query wants recipes with a specific search term returned in a certain order
                                    let formatString = formatSortBy(query);

                                    dbQuery.concat(formatString);
                                }

                                if("limit" in query)
                                {
                                    let formatString = formatLimit(query);

                                    dbQuery.concat(formatString);
                                }

                                dbQuery.concat(";");

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
                            }
                            else if("cuisine" in query)
                            {
                                // if the query wants recipes of a certain cuisine
                                dbQuery = `SELECT recipeID, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE cuisineType = ${query.searchParams.get("cuisine")}`;

                                if("sortby" in query)
                                {
                                    // if the query wants recipes of a certain cuisine returned in a certain order
                                    dbQuery = dbQuery.concat(formatSortBy(query));
                                }

                                if("limit" in query)
                                {
                                    dbQuery = dbQuery.concat(formatLimit(query));
                                }

                                dbQuery = dbQuery.concat(";");

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
                            }
                            else if("sortby" in query)
                            {
                                // if the query wants all recipes returned in a certain order

                                // this string will be filled with a limit optimisation if the query specifies.
                                let limitStr = "", sortbyString = "";

                                dbQuery = "SELECT recipeID, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes";

                                sortbyString = formatSortBy(query);

                                if(sortbyString !== "")
                                {
                                    dbQuery = dbQuery.concat();

                                    if("limit" in query)
                                    {
                                        limitStr = " LIMIT " + query.searchParams.get("limit");
                                    }

                                    dbQuery = dbQuery.concat(limitStr).concat(";");

                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                }
                                else
                                {
                                    // else, the sort by term is invalid, return 400 bad request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, search term missing or not valid";

                                    sendResult(resultMessage);
                                }
                            }
                            else if("recipeID" in query)
                            {
                                // if the query wants a specific recipe
                                dbQuery = `SELECT recipeID, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE recipeID = ${query.searchParams.get("recipeID")}`;

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
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
                    switch (query.pathname)
                    {
                        case "/user":
                            // CASE: adding new user
                            if("uEmail" in query && "uPassword" in query && "uName" in query)
                            {
                                // INSERT INTO User_has_Pantry (User_userID) SELECT User.userID FROM User where User.userEmail = "jon.p.derr@gmail.com";
                                // if all of the necessary fields are present

                                /*
                                INSERT INTO User (userName, userEmail, userKey) values ("Jon", "jon.p.derr@gmail.com", "password");
                                INSERT INTO User_Pantry (User_userID) SELECT userId FROM User WHERE userEmail = "jon.p.derr@gmail.com";
                                */

                                // in this case, need to create a column in the user and the user_pantry table
                                let line1 = "";
                                let line2 = "";

                                let colString = "(userEmail, userName, userKey";
                                let valString = "(" + query.searchParams.get("uEmail") + ", " + query.searchParams.get("uPassword") + ", " + query.searchParams.get("uName");

                                if("uPhone" in query)
                                {
                                    colString = colString.concat(", userPhone");
                                    valString = valString.concat(", " + query.searchParams.get("uPhone"));
                                }

                                colString = colString.concat(") ");
                                valString = valString.concat(");");

                                line1 = "INSERT INTO User " + colString + " values + " + valString;
                                line2 = "INSERT INTO Pantry (User_userID) SELECT userID FROM User WHERE userEmail = " + query.searchParams.get("uEmail") + ";";

                                dbQuery = line1 + line2;

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
                            }
                            else
                            {
                                // else, the request is formatted incorrectly, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request formatted incorrectly.";

                                sendResult(resultMessage);
                            }
                            break;
                        case "/pantry":
                            // CASE: adding new pantry contents

                            /*
                            INSERT INTO Ingredients (IngName) SELECT "Milk" FROM Ingredients WHERE NOT EXISTS (SELECT * FROM Ingredients WHERE Ingredients.IngName LIKE "Milk");
                            INSERT INTO Pantry_has_Ingredients (Pantry_pantryID, Ingredients_IngID, ingredientQuantity, ingredientUnit) SELECT pantryID, IngID, 1, "Gallons" FROM Pantry, Ingredients WHERE Pantry.User_userID = "3" AND Ingredients.IngName LIKE "Milk";
                             */

                            if("rName" in query && "rSteps" in query && "rIngredients" in query)
                            {
                                // if all of the necessary fields are present
                            }
                            else
                            {
                                // else, the request is formatted incorrectly, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request formatted incorrectly.";

                                sendResult(resultMessage);
                            }
                            break;
                        case "/recipe":

                            break;
                        case "/box":

                            break;
                        case "/site":

                            break;
                        case "/userfav":

                            break;
                    }


                    break;
                case "DELETE":
                    // delete logic goes here
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