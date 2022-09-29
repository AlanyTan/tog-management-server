import express from "express";
import cookieParser from "cookie-parser";
import { validateJwt } from "./auth_aad.js";

const simpleui = express.Router()  
.get('/',  validateJwt, (req, res) => {
        res.send(`<!DOCTYPE html> 
        <html lang="en">
        
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content=
                "width=device-width, initial-scale=1.0">
            <meta http-equiv="X-UA-Compatible"
                    content="ie=edge">
            <title>PUT Request</title>
        </head>
        
        <body>
            <h1>
                Simple Feature Flag change...
            </h1>
            <form name="myform" action="javascript:update()">
                <label for="appname"> Application name: </label> <input type="text" name="appname">             <button type="submit" formaction="javascript:listflags()">list all flags</button>
                <br><br>
                <button type="submit" formaction="javascript:deleteflag()"> (BE CAREFUL!!!) Delete flag </button>
                <label for="featurename"> for feature </label> <input type="text" name="featurename" > 
                <label for="onoff"> OR, turn it </label> 
                <select name="onoff" id="onoff">
                <option value="True">On</option>
                <option value="False">Off</option>
                </select> 
                <input name="Submit"  type="submit" value="Update"/>
                
            </form>
            <p  id="flags" > </p>

            <!-- Including library.js and app.js -->
            <script >
            class EasyHTTP {
                async put(url, data) {
                    try {
                        const response = await fetch(url, {
                                method: 'PUT',
                                headers: {
                                'Content-type': 'application/json',
                                },
                                body: JSON.stringify(data)
                        });
                        const resData = await response.json();
                        return resData;
                    } catch (err) {
                        console.log(err)
                    }
                }
                async delete(url) {
                    try {
                        const response = await fetch(url, {
                            method: 'DELETE',
                            headers: {
                            'Content-type': 'application/json',
                            },
                            body: null
                        });
                        const resData = await response;
                        console.log("deleting fetch returned:" + resData.status);
                        if (resData.status == 404) {
                            return "delete failed, flag not found.";
                        }
                        if (resData.status == 204 ) {
                            return "Delete successful.";
                        }
                        return resData;
                    } catch (err) {
                        console.log("deleting ERROR: " + err);    
                    }
                }
                async get(url) {
                    const response = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Content-type': 'application/json'
                        }
                    });
                    const resData = await response.json();
                    return resData;
                }
            }
            function listflags() {
                const http = new EasyHTTP;
                const appname = document.myform.appname.value;
                const URL = 'http://localhost:3000/flags/' + appname  ;
                http.get(URL)
                .then (data => document.getElementById("flags").innerHTML = JSON.stringify(data).replaceAll('},', "},  <br>"))
                .catch(err => console.log(err));
            }
            function deleteflag() {
                const http = new EasyHTTP;
                const onoff = document.myform.onoff.value === "True" ;
                const appname = document.myform.appname.value;
                const featurename = document.myform.featurename.value;
                const URL = 'http://localhost:3000/flags/' + appname + '/' + featurename ;
                http.delete(URL)
                .then(data => document.getElementById("flags").innerHTML =  "deleting [" + featurename + "]..." + ((data == null )? "" : JSON.stringify(data)))
                .catch(err => document.getElementById("flags").innerHTML =  "Failed to delete [" + featurename + "]");
            }

            function update() {
                const http = new EasyHTTP;
                const onoff = document.myform.onoff.value === "True" ;
                const appname = document.myform.appname.value;
                const featurename = document.myform.featurename.value;
                const URL = 'http://localhost:3000/flags/' + appname + '/' + featurename ;
                // User Data
                const rollout = {
                     value: onoff 
                }
                const data = { rollout: [rollout] }
                console.log(data, URL)

                http.put(URL, data)
                .then(data => document.getElementById("flags").innerHTML = JSON.stringify(data))
                //.then(data => console.log(data))
                .catch(err => console.log(err));
            }
            
            </script>
        </body>
        
        </html>
        `);
});

export default simpleui;