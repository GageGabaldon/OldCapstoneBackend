Authenticate files  
How to use:
post a json file in this type:  
{  
    "userName": "tester01",  
    "userPhone": "2983049927",  
    "userEmail": "tester@test.com",  
    "userKey": "testerpass"  
}  
to http://host:4000/user/register to register user    

post a json file in this type:  
{  
    "userName" : "tester01",  
    "userEmail": "tester@test.com",  
    "userKey": "testerpass"  
}  
to http://host:4000/user/gettoken to get token(json)  

post a json file in this type:  
{  
    "userName" : "tester01",  
    "userEmail": "tester@test.com",  
    "userKey": "testerpass",  
    "userToken": "eyJhbGciOiJIUzI1NiIsIasasnR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTYxMzk3MzAwMiwiZXhwIjoxNjE0NTc3ODAyfQ.yunf26Lssg1FinMgSLI68kFaeHlNV8asdsada8_asdasdRkKzCwts41c"  
}  
to http://host:4000/user/authenticate to check approved or not  
