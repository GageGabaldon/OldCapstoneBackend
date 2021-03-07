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
Registration response  
 message: 'Registration successful'  means register success  
 /userEmail and userPhone have to be unique otherwise it will show ... is being taken
 


post a json file in this type:  
{  
    "userName" : "tester01",  
    "userEmail": "tester@test.com",  
    "userKey": "testerpass"  
}  
to http://host:4000/user/gettoken to get token(json)  
Gettoken response  
"eyJhbGciOiJIUzI1NiIsIasasnR5cCI6IkpXVCJ9.eyJzdWIiOjEs"  
It is a json string.  


post a json file in this type:  
{  
    "userName" : "tester01",  
    "userEmail": "tester@test.com",  
    "userKey": "testerpass",  
    "userToken": "eyJhbGciOiJIUzI1NiIsIasasnR5cCI6IkpXVCJ9.eyJzdWIiOjEsImlhdCI6MTYxMzk3MzAwMiwiZXhwIjoxNjE0NTc3ODAyfQ.yunf26Lssg1FinMgSLI68kFaeHlNV8asdsada8_asdasdRkKzCwts41c"  
}  
to http://host:4000/user/authenticate to check approved or not  
Authenticate response  
"Approved" all things right  
"userEmail  is incorrect"  
"userKey is incorrect"  
"userToken is incorrect"  

