// Load in the appropriate libraries
let https = require("https");
let url = require("url");
let mysql = require("mysql");
let fs = require("fs");
let EventEmitter = require("events").EventEmitter;
let validItems = ['user', 'pantry', 'site', 'box', 'recipe'];
let validMethods = ['GET', 'POST', 'DELETE', 'PUT'];
// TODO: implement array of json objects that keep track of valid search terms

const options = {
    key: fs.readFileSync('keys/server/key.pem'),
    cert: fs.readFileSync('keys/server/cert.pem')
};

https.createServer(options, async function(request, response)
{
    console.log("request recieved\n");

    /*
    Function: sendQuery
    Arguments: queries (array of formatted MySQL queries)
    Description: this function takes care of all communication with the database.
                 requires a valid MySQL query to work properly.
    Return: returns the results of the MySQL query as an object, or an object containing an error code and a brief
            description of the problem if an error was encountered.
    */
    async function sendQuery(queries)
    {
        console.log("sendQuery method entered\n");
        let dbcon = mysql.createConnection
        ({
            host: "23.254.161.117",
            user: "customer",
            password: "FridgefillerCustomer",
            database: "FridgeFiller",
            debug: true,
            /*
            ssl:
                {
                    CA: fs.readFileSync('keys/database/ca.pem'),
                    dbKey: fs.readFileSync('keys/database/server-key.pem'),
                    dbCert: fs.readFileSync('keys/database/server-cert.pem')
                }

             */
        });

        return new Promise(async function(resolve, reject)
        {
            let localResult = {code: 200, message: "Database Query Successful", content: []};

            let queryPromise = new Promise(async function (resolve, reject)
            {
                for(let query = 0; query < queries.length; query++)
                {
                    await dbcon.query(queries[query], function (dberr, dbResult, fields)
                    {
                        if (dberr)
                        {
                            // return an error code and a message in an object
                            localResult.code = 500;
                            localResult.message = "Database Query Failed";

                            console.log(`Database query ${query.toString()} failed, exiting\n`);

                            reject(localResult);
                        }
                        else
                        {
                            localResult.content.push(dbResult);

                            console.log(`Database query ${query.toString()} successful\n`);

                            resolve(localResult);
                        }
                    });
                }
            });

            queryPromise.then(function(localResult)
            {
                console.log("Query set finished");

                dbcon.end(function(err)
                {
                    if(err)
                    {
                        console.log("Database connection could not be ended\n");
                        reject(localResult);
                    }
                    else
                    {
                        console.log("Database connection closed, exiting\n");
                        resolve(localResult);
                    }
                });
            }).catch(function(localResult)
            {
                console.log("Query set aborted, error encountered");

                dbcon.end(function(err)
                {
                    if(err)
                    {
                        console.log("Database connection could not be ended\n");
                        reject(localResult);
                    }
                    else
                    {
                        console.log("Database connection closed, exiting\n");
                        reject(localResult);
                    }
                });
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
        console.log(`sendResult Entered, status code is ${funcResult.code}`);

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

            for(let index = 0; index < funcResult.content.length; index++)
            {
                response.write(JSON.stringify(funcResult.content[index]));
            }

            response.end();
            console.log("No error encountered, response written\n");
        }

        console.log("Request processed\n");
    }



    /*
        Function: checkToken
        Arguments: userObj, it's json file contains user's infomation
        Description: use this function to check user's information
        Return: use with checkResult functoin

        userObj style:
        const obj= {
            "userName": " ",
            "userPhone": " ",
            "userEmail": " ",
            "userKey": " ",
            "userToken": " "
        };
    */
    function checkToken(userObj)
    {
        console.log("Check start(Authenticate)");

        let event = new EventEmitter();

        let options = {
            url: 'http://23.254.161.117:4000/user/authenticate',
            body: userObj,
            json: true
        };

        //post user's infomation to the authentication server
        https.request.post(options, function(error, response, body){
            event.body = body;
            event.emit('update');
        });

        //waiting on async post
            event.on('update', function () {
            checkResult(event.body);
            event.emit('checked');
        });
        console.log("Check end(Authenticate)");
    }



    /*
        Function: checkResult
        Arguments: globalBody which is the result sent from authenticate server
        Description: use to get authenticate result from authenticate server
        Return: true if approved, false if user information is not true
    */
    async function checkResult(globalBody)
    {
        var result = globalBody;
        console.log(result);

        if(result == "Approved")
        {
            await console.log("true");
            await( checkFlag = 'true');
            return true;
        }
        else
        {
            await  console.log("false");
            await( checkFlag = 'false');
            return false;
        }
    }


    //run example
    /*
    //call the checkToken to send user info to authenticate server
    checkToken(obj);

    //wait for async event
    event.on('checked', function(){
        //get in function(send query, update pantry.....)
        if(checkFlag == 'true'){
            console.log("check true");
        }
        else{
        console.log("check false");
        }
    });
    */


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

        if(query.pathname === "/recipe")
        {
            if(query.searchParams.get("sortby") === "rating")
            {
                formatString = " ORDER BY recipeRating";
            }
            else if(query.searchParams.get("sortby") === "cooktime")
            {
                formatString = " ORDER BY timeToMake";
            }
            else if(query.searchParams.get("sortby") === "popular")
            {
                formatString = " ORDER BY numRatings";
            }
            else if(query.searchParams.get("sortby") === "cuisine")
            {
                formatString = " ORDER BY cuisineType";
            }
        }

        return formatString;
    }



    /*
        Function: formatSortBy
        Arguments: query (query object from parsed URL)
        Description: This function checks the query for the limit tag, formats the necessary query string, and returns that string
        Return: a String that can be concatenated onto another query string to limit the query results. If the string is null, the
                sort term is invalid.
     */
    function formatLimit(query)
    {
        let limitStr = "";

        if(query.searchParams.get("limit"))
        {
            limitStr = " LIMIT " + query.searchParams.get("limit");
        }

        return limitStr;
    }



    /*
        Function: getRecipeData
        Arguments: queryResult (Single-element array of JSON objects holding the results of the query)
        Description: This function builds a JSON object for each recipe in the query results
        Return: a JSON object containing complete recipe information
     */
    function getRecipeData(queryResult)
    {
        console.log("getRecipeData entered");

        // there should only be one entry in the queryResult array, which is another array containing recipe information
        let localQueryResult = queryResult.content[0];

        if(localQueryResult.length !== 0)
        {
            let result, queryIDs = [], queryIDs_s, querySet = [];

            // for result in queryResult
            for(result in localQueryResult)
            {
                // add new fields: ingredients (array), steps (array), numSteps (int, init to 0), and numIngredients (int, init to 0)
                localQueryResult[result].ingredients = [];
                localQueryResult[result].steps = [];
                localQueryResult[result].numSteps = 0;
                localQueryResult[result].numIngredients = 0;

                // push recipeID into recipeID array if it is present
                if(localQueryResult[result].hasOwnProperty("recipeID"))
                {
                    queryIDs.push(localQueryResult[result].recipeID);
                }
            }

            console.log("queryresult modified");

            // stringify recipeID array
            queryIDs_s = `(${queryIDs.toString()})`;

            // format query string for getting ingredients, use stringified recipeID array
            let ingredientQuery = `SELECT Recipes_recipeID, IngID, IngName FROM FridgeFiller.Recipe_has_Ingredients INNER JOIN Ingredients ON Recipe_has_Ingredients.Ingredients_IngID = Ingredients.IngID WHERE Recipe_has_Ingredients.Recipes_recipeID IN ${queryIDs_s};`;
            querySet.push(ingredientQuery);

            // format query string for getting steps, use stringified recipeID array
            let stepQuery = `SELECT Recipes_recipeID, stepNum, stepContent FROM FridgeFiller.recipeSteps INNER JOIN Recipes ON recipeSteps.Recipes_recipeID = Recipes.recipeID WHERE recipeID IN ${queryIDs_s};`;
            querySet.push(stepQuery);

            console.log("getRecipeData: entering promise");

            return new Promise(async function(resolve, reject)
            {
                console.log("getRecipeData: promise entered");
                // send queries, use await for each sendQuery call and store results in ingredientResult and stepResult
                try
                {
                    let queryResults = await sendQuery(querySet);
                    let ingredientResult = queryResults.content[0];
                    let stepResult = queryResults.content[1];
                    let ingValue, stepValue;

                    if(ingredientResult.length != 0 && stepResult.length != 0)
                    {
                        // for result in queryResult
                        for(result in localQueryResult)
                        {
                            // for value in ingredientResult
                            for(ingValue in ingredientResult)
                            {
                                // if recipeID in queryResult === recipeID in ingredientResult
                                if(localQueryResult[result].recipeID === ingredientResult[ingValue].Recipes_recipeID)
                                {
                                    // add ingredientResult entry at index value into queryResult.ingredients at current result index
                                    localQueryResult[result].ingredients.push(ingredientResult[ingValue]);
                                    localQueryResult[result].numIngredients++;
                                }
                            }

                            // for value in stepResult (NOT async)
                            for(stepValue in stepResult)
                            {
                                // if recipeID in queryResult === recipeID in stepResult
                                if(localQueryResult[result].recipeID === stepResult[stepValue].Recipes_recipeID)
                                {
                                    // add stepResult entry at index value into queryResult.steps
                                    localQueryResult[result].steps.push(stepResult[stepValue]);
                                    localQueryResult[result].numSteps++;
                                }
                            }
                        }

                        // return the modified queryResult object

                        resolve(queryResult);
                    }
                    else
                    {
                        reject(queryResult);
                    }
                }
                catch(err)
                {
                    queryResult.code = 500;
                    queryResult.message = "Database query failed";

                    reject(queryResult);
                }

            });
        }
        else
        {
            queryResult.code = 500;
            queryResult.message = "Database query failed";

            return queryResult;
        }
    }



    /*
        Function: addIngredients
        Arguments: requestData (an array of JSON objects containing the data to be checked and sent)
        Description: This function checks for existing ingredients in the Ingredients table, adds new entries if they don't exist,
                     and then adds those entries to the respective has_Ingredients table
        Return: a standard result object containing an status code, message, and an empty content field
     */
    async function addIngredients(requestData)
    {
        console.log("addIngredients method entered");

        return new Promise(async function(resolve, reject)
        {
            let ingData = [], querySet = [], queryString = "";
            let resultMessage = {code: 500, message: "An unexpected error occurred", content: []};

            try
            {
                if(requestData.hasOwnProperty("ingredients") && (requestData.hasOwnProperty("recipeName") || requestData.hasOwnProperty("userID")))
                {
                    // if the requestData has an ingredients field
                    ingData = requestData.ingredients;

                    for(let index in ingData)
                    {
                        queryString = `SELECT * FROM Ingredients WHERE IngName LIKE "${ingData[index].ingredientName}";`;
                        querySet.push(queryString);
                    }

                    let queryResult = await sendQuery(querySet);
                    let queryResultContent = queryResult.content;
                    let currIngredient;
                    querySet = [];

                    for(let index = 0; index < queryResultContent.length; index++)
                    {
                        currIngredient = queryResultContent[index];

                        if(currIngredient.length === 0)
                        {
                            // if there is no entries for the specified ingredient name, insert it into the table
                            queryString = `INSERT INTO Ingredients (IngName) VALUES ("${ingData[index].ingredientName}");`;

                            querySet.push(queryString);
                        }
                    }

                    if(querySet.length !== 0)
                    {
                        queryResult = await sendQuery(querySet);
                    }

                    if(queryResult.code === 200 || querySet.length !== 0)
                    {
                        // if everything inserted correctly
                        let tableString = "", specFieldName = "", specFieldContent = "", searchTable = "", specSearchField = "", specSearchContent;

                        querySet = [];

                        if(requestData.hasOwnProperty("recipeName"))
                        {
                            // if the request is for the recipe table, set the table name to Recipe_has_Ingredients
                            tableString = "Recipe_has_Ingredients";
                            specFieldName = "Recipes_recipeID";
                            specFieldContent = "recipeID";
                            searchTable = "Recipes";
                            specSearchField = "recipeName";
                            specSearchContent = `"${requestData.recipeName}"`;
                        }
                        else
                        {
                            // else, the query is for the pantry table, set the table name to Pantry_has_Ingredients
                            tableString = "Pantry_has_Ingredients";
                            specFieldName = "Pantry_pantryID";
                            specFieldContent = "pantryID";
                            searchTable = "Pantry";
                            specSearchField = "User_userID";
                            specSearchContent = requestData.userID;
                        }

                        for(let index in ingData)
                        {
                            queryString = `INSERT INTO ${tableString} (Ingredients_IngID, ${specFieldName}, ingredientQuantity, ingredientUnit) SELECT IngID, ${specFieldContent}, ${ingData[index].ingredientQuantity}, "${ingData[index].ingredientUnit}" FROM Ingredients, ${searchTable} WHERE Ingredients.IngName LIKE "${ingData[index].ingredientName}" AND ${searchTable}.${specSearchField} = ${specSearchContent};`;

                            querySet.push(queryString);
                        }

                        queryResult = await sendQuery(querySet);

                        if(queryResult.code === 200)
                        {
                            resolve(queryResult);
                        }
                        else
                        {
                            reject(queryResult);
                        }
                    }
                    else
                    {
                        reject(queryResult);
                    }
                }
                else
                {
                    // else, the JSON is formatted incorrectly, return 400 Bad Request
                    resultMessage.code = 400;
                    resultMessage.message = "Bad Request: JSON data is missing fields or otherwise formatted incorrectly";

                    reject(resultMessage);
                }
            }
            catch(err)
            {
                // on err, return 500 Internal Server Error
                resultMessage.code = 500;
                resultMessage.message = `Internal Server Error: ${err.message}`;

                reject(resultMessage);
            }
        });



    }


    // start server logic
    console.log("provided url is "+ request.url +'\n');

    response.setHeader("Access-Control-Allow-Origin", '*');
    response.setHeader("Access-Control-Request-Method", '*');
    response.setHeader("Access-Control-Allow-Methods", 'GET, POST, DELETE, PUT');
    response.setHeader("Access-Control-Allow-Headers", '*');

    let query = new url.URL(request.url, `https://${request.headers.host}`);
    let dbQuery = [];
    let resultMessage = {code: 500, message: "An unexpected error occurred", content: []};

    console.log("Request recieved\n");

    // first, check to see if the method is valid
    if(validMethods.includes(request.method))
    {
        // if the method is valid, check the specified pathname to make sure it is valid
        if(checkTermValid(query.pathname)) {
            switch (request.method) {
                case "GET":
                    // check the path name for the requested resource
                    console.log(`request type: GET, pathname is ${query.pathname} \n arguments are: ${query.searchParams.get("source")}`);
                    switch (query.pathname) {
                        case "/user":
                            // if request is for user information, check query contents to make sure necessary items are present
                            console.log(`user case entered, query is ${query.searchParams}\n`);

                            // TODO: CHECK FOR AUTH CODE WHEN AUTH SERVER IMPLEMENTED
                            /*&& "authcode" in query*/
                            if (query.searchParams.has("uid")) {
                                console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true) {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbquery
                                    dbQuery.push(`SELECT userName, userPhone, userEmail FROM User where userID = ${query.searchParams.get("uid")}`);
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                } else if (false) {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                } else {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            } else if (query.searchParams.has("uemail")) {
                                // get user information based on email
                                dbQuery.push(`SELECT userName, userPhone, userID FROM User WHERE userEmail = "${query.searchParams.get("uemail")}";`);

                                sendQuery(dbQuery).then(sendResult).catch(sendResult);
                            } else {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/pantry":
                            if (query.searchParams.has("uid")) {
                                // console.log("uid case entered\n");
                                // first, check auth code (when auth server is ready)
                                if (true) {
                                    console.log("query formatted correctly\n");
                                    // if the auth code is valid, construct the dbQuery
                                    // SELECT Ingredients_IngID, IngName, ingredientQuantity, ingredientUnit FROM Pantry INNER JOIN Pantry_has_Ingredients ON Pantry.pantryID INNER JOIN Ingredients ON Pantry_has_Ingredients.Ingredients_IngID WHERE Pantry.User_userID = 3 AND Pantry_has_Ingredients.Pantry_pantryID = Pantry.pantryID AND Pantry_has_Ingredients.Ingredients_IngID = Ingredients.IngID;

                                    let userID = query.searchParams.get("uid");
                                    dbQuery.push(`SELECT Ingredients_IngID, IngName, ingredientQuantity, ingredientUnit FROM Pantry INNER JOIN Pantry_has_Ingredients ON Pantry.pantryID INNER JOIN Ingredients ON Pantry_has_Ingredients.Ingredients_IngID WHERE Pantry.User_userID = ${userID} AND Pantry_has_Ingredients.Pantry_pantryID = Pantry.pantryID AND Pantry_has_Ingredients.Ingredients_IngID = Ingredients.IngID;`);
                                    // then, send the query to the database
                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                } else if (false) {
                                    // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                    resultMessage.code = 403;
                                    resultMessage.message = "Permissions not valid for this resource";

                                    sendResult(resultMessage);
                                } else {
                                    // else return code 401 Unauthorized
                                    resultMessage.code = 401;
                                    resultMessage.message = "Authorization code not valid";

                                    sendResult(resultMessage);
                                }
                            } else {
                                // if either the UID or authcode are missing, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/sites":
                            // if request is for distribution sites/snap retailers, check query contents
                            if (query.searchParams.has("city")) {
                                if (query.searchParams.has("county") || query.searchParams.has("state") || query.searchParams.has("zip")) {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                } else {
                                    // build query
                                    dbQuery.push(`SELECT * FROM DistributionSites WHERE siteCity = "${query.searchParams.has("city")}"`);
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            } else if (query.searchParams.has("county")) {
                                if (query.searchParams.has("city") || query.searchParams.has("state") || query.searchParams.has("zip")) {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                } else {
                                    // build query
                                    dbQuery.push(`SELECT * FROM DistributionSites WHERE siteCounty =  "${query.searchParams.get("county")}"`);
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            } else if (query.searchParams.has("state")) {
                                if (query.searchParams.has("county") || query.searchParams.has("city") || query.searchParams.has("zip")) {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                } else {
                                    // build query
                                    dbQuery.push(`SELECT * FROM DistributionSites WHERE siteState = "${query.searchParams.get("state")}"`);
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            } else if (query.searchParams.has("zip")) {
                                if (query.searchParams.has("county") || query.searchParams.has("state") || query.searchParams.has("city")) {
                                    // multiple query terms present, send back 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, multiple search terms present";

                                    sendResult(resultMessage);
                                } else {
                                    // build query
                                    dbQuery.push(`SELECT * FROM DistributionSites WHERE siteZip = ${query.searchParams.get("zip")}`);
                                    // send query to database
                                    sendQuery(dbQuery).then(sendResult);
                                }
                            } else {
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/recipe":
                            // if request is for recipes, check query contents
                            if (query.searchParams.has("uid")) {
                                // if the query wants recipes for a certain user
                                if (query.searchParams.get("source") === "favorite") {
                                    // if the request is for recipes a user has favorited

                                    let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes LEFT JOIN User_has_Recipes ON Recipes.recipeID = User_has_Recipes.Recipes_recipeID WHERE User_has_Recipes.User_userID = ${query.searchParams.get("uid")}`

                                    if (query.searchParams.has("sortby")) {
                                        // if the query wants user favorite recipes sorted in a certain way

                                        let formatString = formatSortBy(query);

                                        if (formatString !== "") {
                                            queryString.concat(formatString);
                                        } else {
                                            // else, return 400 Bad Request
                                            resultMessage.code = 400;
                                            resultMessage.message = "Request not valid, search term missing or not valid";

                                            sendResult(resultMessage);
                                        }
                                    }

                                    if (query.searchParams.has("limit")) {
                                        let formatString = formatLimit(query);

                                        queryString.concat(formatString);
                                    }

                                    queryString.concat(";");

                                    dbQuery.push(queryString);

                                    sendQuery(dbQuery).then(async function (result) {
                                        await getRecipeData(result).then(sendResult).catch(sendResult)
                                    }).catch(sendResult);
                                } else if (query.searchParams.get("source") === "pantry") {
                                    // if the request is for recipes a user can make with their pantry contents
                                    let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipe_has_Ingredients INNER JOIN Pantry_has_Ingredients ON Recipe_has_Ingredients.Ingredients_IngID = Pantry_has_Ingredients.Ingredients_IngID INNER JOIN Recipes ON Recipe_has_Ingredients.Recipes_recipeID = Recipes.recipeID INNER JOIN Pantry on Pantry_has_Ingredients.Pantry_pantryID = Pantry.pantryID WHERE Pantry.User_userID = ${query.searchParams.get("uid")};`;

                                    if (query.searchParams.has("sortby")) {
                                        // if the query wants pantry-specific recipes sorted in a certain way
                                        let formatString = formatSortBy(query);

                                        if (formatString !== "") {
                                            queryString.concat(formatString);
                                        } else {
                                            // else, return 400 Bad Request

                                            resultMessage.code = 400;
                                            resultMessage.message = "Request not valid, search term missing or not valid";

                                            sendResult(resultMessage);
                                        }
                                    }

                                    dbQuery.push(queryString);

                                    sendQuery(dbQuery).then(async function (result) {
                                        await getRecipeData(result).then(sendResult).catch(sendResult)
                                    }).catch(sendResult);
                                } else {
                                    // if neither case is true, send 400 Bad Request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, search term missing or not valid";

                                    sendResult(resultMessage);
                                }
                            } else if (query.searchParams.has("searchby")) {
                                // if the query specifies a search term
                                let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE recipeName LIKE "%${query.searchParams.get("searchby")}%"`;

                                if (query.searchParams.has("sortby")) {
                                    // if the query wants recipes with a specific search term returned in a certain order
                                    let formatString = formatSortBy(query);

                                    queryString.concat(formatString);
                                }

                                if (query.searchParams.has("limit")) {
                                    let formatString = formatLimit(query);

                                    queryString.concat(formatString);
                                }

                                queryString.concat(";");

                                dbQuery.push(queryString);

                                sendQuery(dbQuery).then(async function (result) {
                                    getRecipeData(result).then(sendResult).catch(sendResult)
                                }).catch(sendResult);
                            } else if (query.searchParams.has("cuisine")) {
                                // if the query wants recipes of a certain cuisine
                                let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE cuisineType = "${query.searchParams.get("cuisine")}"`;

                                if (query.searchParams.has("sortby")) {
                                    // if the query wants recipes of a certain cuisine returned in a certain order
                                    queryString = queryString.concat(formatSortBy(query));
                                }

                                if (query.searchParams.has("limit")) {
                                    queryString = queryString.concat(formatLimit(query));
                                }

                                queryString = queryString.concat(";");

                                dbQuery.push(queryString);

                                sendQuery(dbQuery).then(async function (result) {
                                    getRecipeData(result).then(sendResult).catch(sendResult);
                                }).catch(sendResult);
                            } else if (query.searchParams.has("sortby")) {
                                // if the query wants all recipes returned in a certain order

                                // this string will be filled with a limit optimisation if the query specifies.
                                let limitStr = "", sortbyString = "";

                                let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes`;

                                sortbyString = formatSortBy(query);

                                if (sortbyString !== "") {
                                    queryString = queryString.concat(sortbyString);

                                    if (query.searchParams.has("limit")) {
                                        limitStr = " LIMIT " + query.searchParams.get("limit");
                                    }

                                    queryString = queryString.concat(limitStr).concat(";");

                                    dbQuery.push(queryString);

                                    sendQuery(dbQuery).then(async function (result) {
                                        getRecipeData(result).then(sendResult).catch(sendResult)
                                    }).catch(sendResult);
                                } else {
                                    // else, the sort by term is invalid, return 400 bad request
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request not valid, search term missing or not valid";

                                    sendResult(resultMessage);
                                }
                            } else if (query.searchParams.has("recipeID")) {
                                // if the query wants a specific recipe
                                let queryString = `SELECT recipeID, recipeName, cuisineType, timeToMake, recipeRating, numRatings FROM Recipes WHERE recipeID = ${query.searchParams.get("recipeID")}`;

                                dbQuery.push(queryString);

                                sendQuery(dbQuery).then(async function (result) {
                                    getRecipeData(result).then(sendResult).catch(sendResult)
                                }).catch(sendResult);
                            } else {
                                // if none of the above identifiers are present, send back 400 bad request

                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term missing or not valid";

                                sendResult(resultMessage);
                            }

                            break;
                        case "/box":
                            // if request is for food boxes, check query contents
                            if (query.searchParams.has("boxname")) {
                                let queryString = "";

                                if (query.searchParams.get("boxname") === '*') {
                                    queryString = `SELECT boxID, boxName, IngName FROM Boxes INNER JOIN Boxes_has_Ingredients ON Boxes.boxID = Boxes_has_Ingredients.Boxes_boxID INNER JOIN Ingredients ON Boxes_has_Ingredients.Ingredients_IngID = Ingredients.IngID;`;
                                } else {
                                    queryString = `SELECT boxID, boxName, IngName FROM Boxes INNER JOIN Boxes_has_Ingredients ON Boxes.boxID = Boxes_has_Ingredients.Boxes_boxID INNER JOIN Ingredients ON Boxes_has_Ingredients.Ingredients_IngID = Ingredients.IngID WHERE Boxes.boxName = ${query.searchParams.get("boxname")};`
                                }

                                dbQuery.push(queryString);

                                sendQuery(dbQuery).then(sendResult);
                            } else {
                                // maybe get rid of this?

                                // if box type identifier is not present, send back 400 Bad Request
                                resultMessage.code = 400;
                                resultMessage.message = "Request not valid, search term invalid";

                                sendResult(resultMessage);
                            }
                            break;
                    }
                    break;
                case "POST":
                    let data = "";
                    switch (query.pathname) {
                        case "/user":
                            // CASE: adding new user
                            // query.searchParams.has("uEmail") && query.searchParams.has("uPassword") && query.searchParams.has("uName")

                            request.on("data", function (inData) {
                                // when data is received, concatenate it to the data string
                                data = data.concat(inData.toString());
                            });

                            request.on("end", function () {
                                // when the data has fully sent, do everything else
                                try {
                                    let queryData = JSON.parse(data);

                                    if (queryData.hasOwnProperty("userName") && queryData.hasOwnProperty("userPassword") && queryData.hasOwnProperty("userEmail")) {
                                        // in this case, need to create a column in the user and the user_pantry table

                                        let colString = "(userEmail, userName, userKey";
                                        let valString = `"${queryData.userEmail}", "${queryData.userName}", "${queryData.userPassword}"`;

                                        if (queryData.hasOwnProperty("userPhone")) {
                                            colString = colString.concat(", userPhone");
                                            valString = valString.concat(`, "${queryData.userPhone}"`);
                                        }

                                        colString = colString.concat(") ");
                                        valString = valString.concat(");");

                                        let line1 = `INSERT INTO User ${colString} values ${valString}`;
                                        let line2 = `INSERT INTO Pantry (User_userID) SELECT userID FROM User WHERE userEmail = "${queryData.userEmail}";`;

                                        dbQuery.push(line1);
                                        dbQuery.push(line2);

                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    } else {
                                        // else, the JSON is formatted incorrectly, send back 400 Bad Request
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly.";

                                        sendResult(resultMessage);
                                    }
                                } catch (err) {
                                    resultMessage.code = 500;
                                    resultMessage.message = err.message;

                                    sendResult(resultMessage);
                                }
                            });

                            break;
                        case "/pantry":
                            // CASE: adding new pantry contents

                            request.on("data", function (inData) {
                                data = data.concat(inData.toString());
                            });

                            request.on("end", function ()
                            {
                                try
                                {
                                    let queryData = JSON.parse(data);

                                    if (queryData.hasOwnProperty("ingredients") && queryData.hasOwnProperty("userID"))
                                    {
                                        addIngredients(queryData).then(sendResult).catch(sendResult);
                                    }
                                    else
                                    {
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                        sendResult(resultMessage);
                                    }
                                }
                                catch (err)
                                {
                                    resultMessage.code = 500;
                                    resultMessage.message = err.message;

                                    sendResult(resultMessage);
                                }
                            });

                            break;
                        case "/recipe":
                            request.on("data", function (inData) {
                                data = data.concat(inData.toString());
                            });

                            request.on("end", function ()
                            {
                                try {
                                    let queryData = JSON.parse(data);

                                    if (queryData.hasOwnProperty("recipeName"))
                                    {
                                        // first, create the recipe information
                                        let line1 = "";

                                        // then, send the recipe instructions
                                        let line4 = "";

                                        let line1Fields = `recipeName, numRatings, recipeRating`;
                                        let line1Values = `"${queryData.recipeName}", 0, 0.0`;

                                        if (queryData.hasOwnProperty("cuisine"))
                                        {
                                            line1Fields = line1Fields.concat(`, cuisineType`);
                                            line1Values = line1Values.concat(`, "${queryData.cuisine}"`);
                                        }

                                        if (queryData.hasOwnProperty("timeToMake"))
                                        {
                                            line1Fields = line1Fields.concat(`, timeToMake`);
                                            line1Values = line1Values.concat(`, "${queryData.timeToMake}"`);
                                        }

                                        line1 = `INSERT INTO Recipes (${line1Fields}) VALUES (${line1Values});`;

                                        dbQuery.push(line1);

                                        sendQuery(dbQuery).then(async function()
                                        {
                                            if (queryData.hasOwnProperty("ingredients") && queryData.hasOwnProperty("steps"))
                                            {
                                                if (queryData.ingredients.length !== 0 && queryData.steps.length !== 0)
                                                {
                                                    await addIngredients(queryData).then(function()
                                                    {
                                                        console.log("Ingredients added");

                                                        dbQuery = [];

                                                        for (let step = 0; step < queryData.steps.length; step++)
                                                        {
                                                            if (queryData.steps[step].hasOwnProperty("stepNum") && queryData.steps[step].hasOwnProperty("stepContent"))
                                                            {
                                                                line4 = `INSERT INTO recipeSteps (Recipes_recipeID, stepNum, stepContent) SELECT recipeID, ${queryData.steps[step].stepNum}, "${queryData.steps[step].stepContent}" FROM Recipes WHERE Recipes.recipeName = "${queryData.recipeName}"`;

                                                                dbQuery.push(line4);
                                                            }
                                                            else
                                                            {
                                                                resultMessage.code = 400;
                                                                resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                                                sendResult(resultMessage);
                                                                break;
                                                            }
                                                        }

                                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                                    }).catch(sendResult);
                                                }
                                                else
                                                {
                                                    resultMessage.code = 400;
                                                    resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                                    sendResult(resultMessage);
                                                }

                                            }
                                            else
                                            {
                                                resultMessage.code = 400;
                                                resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                                sendResult(resultMessage);
                                            }
                                        }).catch(sendResult);
                                    }
                                    else
                                    {
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                        sendResult(resultMessage);
                                    }
                                }
                                catch (err)
                                {
                                    resultMessage.code = 500;
                                    resultMessage.message = err.message;

                                    sendResult(resultMessage);
                                }
                            });

                            break;
                        case "/box":
                            // CASE: posting new food box

                            let line1 = "", line2 = "", line3 = "";

                            request.on("data", function (dataIn) {
                                data = data.concat(dataIn);
                            });

                            request.on("end", function () {
                                let queryData = JSON.parse(data);

                                if (queryData.hasOwnProperty("boxName")) {
                                    // first, create entry in box table
                                    line1 = `INSERT INTO Boxes (boxName) VALUES ("${queryData.boxName}");`;

                                    dbQuery.push(line1);

                                    if (queryData.hasOwnProperty("ingredients")) {
                                        // for each ingredient
                                        for (let index = 0; index < queryData.ingredients.length; index++) {
                                            if (queryData.ingredients[index].hasOwnProperty("ingName") && queryData.ingredients[index].hasOwnProperty("ingredientQuantity")) {
                                                // next, add ingredients to ingredients table
                                                line2 = `INSERT INTO Ingredients (IngName) SELECT "${queryData.ingredients[index].ingName}" FROM Ingredients WHERE NOT EXISTS (SELECT * FROM Ingredients WHERE Ingredients.IngName LIKE "${queryData.ingredients[index].ingName}") LIMIT 1`;
                                                dbQuery.push(line2);

                                                // then, add ingredients to box_has_ingredients table
                                                line3 = `INSERT INTO Boxes_has_Ingredients (Boxes_boxID, Ingredients_IngID, ingredientQuantity) SELECT boxID, IngID, ${queryData.ingredients[index].ingredientQuantity} FROM Boxes, Ingredients WHERE Boxes.boxName = "${queryData.boxName}" AND Ingredients.IngName = "${queryData.ingredients[index].ingName}"`;
                                                dbQuery.push(line3);
                                            } else {
                                                resultMessage.code = 400;
                                                resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                                sendResult(resultMessage);

                                                break;
                                            }
                                        }
                                        // send queries
                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    } else {
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                        sendResult(resultMessage);
                                    }
                                } else {
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                    sendResult(resultMessage);
                                }
                            });

                            break;
                        case "/site":
                            // CASE: posting new distribution site

                            break;
                        case "/userfav":
                            // CASE: add recipe to user favorites
                            request.on("data", function (inData) {
                                data = data.concat(inData.toString())
                            });

                            request.on("end", function () {
                                let queryData = JSON.parse(data);

                                if (queryData.hasOwnProperty("userID") && queryData.hasOwnProperty("recipeID")) {
                                    dbQuery = `INSERT INTO User_has_Recipes (User_userID, Recipes_recipeID) VALUES (${queryData.userID}, ${queryData.recipeID})`;

                                    sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                } else {
                                    resultMessage.code = 400;
                                    resultMessage.message = "Request JSON data is missing fields or otherwise formatted incorrectly";

                                    sendResult(resultMessage);
                                }
                            });
                            break;
                    }
                    break;
                case "DELETE":
                    console.log(`request type: DELETE, pathname is ${query.pathname} \n arguments are: ${query.searchParams.get("source")}`);
                    // delete logic goes here
                    switch (query.pathname) {
                        case "/user":
                            // if request is for user information, check query contents to make sure necessary items are present
                            console.log(`user case entered, query is ${query.searchParams}\n`);
                            // TODO: CHECK FOR AUTH CODE WHEN AUTH SERVER IMPLEMENTED
                            /*&& "authcode" in query*/
                            if (query.searchParams.has("uid")) {
                               console.log("uid case entered\n");
                               // first, check auth code (when auth server is ready)
                               if (true) {
                                  console.log("query formatted correctly\n");
                                  // if the auth code is valid, construct the dbquery
                                  dbQuery.push(`DELETE FROM User where userID = ${query.searchParams.get("uid")};`);
                                  // then, send the query to the database
                                  sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                  } else if (false) {
                                   // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                   resultMessage.code = 403;
                                   resultMessage.message = "Permissions not valid for this resource";

                                   sendResult(resultMessage);
                                   } else {
                                   // else return code 401 Unauthorized
                                   resultMessage.code = 401;
                                   resultMessage.message = "Authorization code not valid";

                                   sendResult(resultMessage);
                                   }
                                } else if (query.searchParams.has("uemail")) {
                               // get user information based on email
                               dbQuery.push(`DELETE FROM User WHERE userEmail = ${query.searchParams.get("uemail")};`);

                               sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                } else {
                                  // if either the UID or authcode are missing, send back 400 Bad Request
                                  resultMessage.code = 400;
                                  resultMessage.message = "Request not valid";

                                  sendResult(resultMessage);
                                }

                                break;
                                case "/pantry":
                                    if (query.searchParams.has("uid")) {
                                        // console.log("uid case entered\n");
                                        // first, check auth code (when auth server is ready)
                                        if (true) {
                                            console.log("query formatted correctly\n");

                                            let userID = query.searchParams.get("uid");
                                            dbQuery.push(`DELETE Pantry_has_Ingredients, Ingredients FROM Pantry INNER JOIN Pantry_has_Ingredients ON Pantry.pantryID = Pantry_has_Ingredients.Pantry_pantryID INNER JOIN Ingredients ON Pantry_has_Ingredients.Ingredients_IngID = Ingredients.IngID WHERE Pantry.User_userID = ${userID} AND Ingredients.IngID = Pantry_has_Ingredients.Ingredients_IngID ;`);
                                            // then, send the query to the database
                                            sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                        } else if (false) {
                                            // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                            resultMessage.code = 403;
                                            resultMessage.message = "Permissions not valid for this resource";

                                            sendResult(resultMessage);
                                        } else {
                                            // else return code 401 Unauthorized
                                            resultMessage.code = 401;
                                            resultMessage.message = "Authorization code not valid";

                                            sendResult(resultMessage);
                                        }
                                    } else if(query.searchParams.has("IngName")){
                                    	if (true) {
                                            console.log("query formatted correctly\n");

                                            dbQuery.push(`DELETE FROM Ingredients WHERE IngName = ${query.searchParams.get("IngName")};`);
                                            // then, send the query to the database
                                            sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                        } else if (false) {
                                            // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                            resultMessage.code = 403;
                                            resultMessage.message = "Permissions not valid for this resource";

                                            sendResult(resultMessage);
                                        } else {
                                            // else return code 401 Unauthorized
                                            resultMessage.code = 401;
                                            resultMessage.message = "Authorization code not valid";

                                            sendResult(resultMessage);
                                        }

                                    }else {
                                        // if either the UID or authcode are missing, send back 400 Bad Request
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request not valid";

                                        sendResult(resultMessage);
                                    }

                                    break;
                                case "/sites":
                                    if (query.searchParams.has("siteName")) {
                                        if (true) {
                                        	console.log("query formatted correctly\n");
                                            
                                            dbQuery.push(`DELETE FROM DistributionSites WHERE siteName = ${query.searchParams.get("siteName")};`);
                                        } else if (false) {
                                            // else if auth code valid but permissions are wrong, return code 403 Forbidden
                                            resultMessage.code = 403;
                                            resultMessage.message = "Permissions not valid for this resource";

                                            sendResult(resultMessage);
                                        } else {
                                            // else return code 401 Unauthorized
                                            resultMessage.code = 401;
                                            resultMessage.message = "Authorization code not valid";

                                            sendResult(resultMessage);
                                        }
                                   
                                    } else {
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request not valid, search term invalid";

                                        sendResult(resultMessage);
                                    }

                                    break;
                                case "/recipe":
                                    // if request is for recipes, check query contents
                                    if (query.searchParams.has("uid")) {
                                        // if the query wants recipes for a certain user
                                        if (query.searchParams.get("source") === "favorite") {
                                            //used for customer to delete favorite recipe
                                            let queryString = `DELETE FROM User_has_Recipes WHERE User_userID = ${query.searchParams.get("uid")}`

                                            dbQuery.push(queryString);

                                            sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                        } else {
                                            // if neither case is true, send 400 Bad Request
                                            resultMessage.code = 400;
                                            resultMessage.message = "Request not valid, search term missing or not valid";

                                            sendResult(resultMessage);
                                        }
                                    } else if (query.searchParams.has("recipeID")) {
                                        //used for admin to delete the whole recipe
                                        let queryString = `DELETE Recipes, Recipe_has_Ingredients, recipeSteps FROM Recipes INNER JOIN Recipe_has_Ingredients ON Recipes.recipeID = Recipe_has_Ingredients.Recipes_recipeID INNER JOIN recipeSteps ON Recipes.recipeID = recipeSteps.Recipes_recipeID WHERE recipeID = ${query.searchParams.get("recipeID")}`;

                                        dbQuery.push(queryString);

                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    } else {
                                        // if none of the above identifiers are present, send back 400 bad request

                                        resultMessage.code = 400;
                                        resultMessage.message = "Request not valid, search term missing or not valid";

                                        sendResult(resultMessage);
                                    }

                                    break;
                                case "/box":
                                    // if request is for food boxes, check query contents
                                    if (query.searchParams.has("boxName")) {
                                        let queryString = `DELETE Boxes, Boxes_has_Ingredients, Ingredients FROM Boxes INNER JOIN Boxes_has_Ingredients ON Boxes.boxID = Boxes_has_Ingredients.Boxes_boxID INNER JOIN Ingredients ON Boxes_has_Ingredients.Ingredients_IngID = Ingredients.IngID WHERE Boxes.boxName = ${query.searchParams.get("boxName")}; `;

                                        dbQuery.push(queryString);

                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    } else if(query.searchParams.has("boxID")){
                                        let queryString = `DELETE Boxes, Boxes_has_Ingredients, Ingredients FROM Boxes INNER JOIN Boxes_has_Ingredients ON Boxes.boxID = Boxes_has_Ingredients.Boxes_boxID INNER JOIN Ingredients ON Boxes_has_Ingredients.Ingredients_IngID = Ingredients.IngID WHERE Boxes.boxID = ${query.searchParams.get("boxID")}; `;

                                        dbQuery.push(queryString);

                                        sendQuery(dbQuery).then(sendResult).catch(sendResult);
                                    }
                                    else {
                                        // maybe get rid of this?

                                        // if box type identifier is not present, send back 400 Bad Request
                                        resultMessage.code = 400;
                                        resultMessage.message = "Request not valid, search term invalid";

                                        sendResult(resultMessage);
                                    }
                                    break;
                            }

                    break;
                case "PUT":
                    // put logic goes here
                    switch (query.pathname) {
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
