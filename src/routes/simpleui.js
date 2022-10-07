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
                <button style="color:red" type="submit" formaction="javascript:deleteflag()"> (BE CAREFUL!!!) Delete flag </button>
                <label for="featurename"> for feature </label> <input type="text" name="featurename" > 
                <label for="onoff"> OR, turn it </label> 
                <select name="onoff" id="onoff">
                <option value="True">On</option>
                <option value="False">Off</option>
                </select> 
                <input name="Submit"  type="submit" value="Update"/><br>
                <span style='color:red;margin-right:25em; display:inline-block;'>&nbsp;</span>
                <button type="submit" formaction="javascript:addrollout()"> + Audience Specific toggle </button>
                
            </form>
            <div id="rollouts" > </div>
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
            function addrollout () {
                var number = document.getElementById("rollouts").children.length/3;
                var container = document.getElementById("rollouts");
                ////remove children in the container if needed
                //while (container.hasChildNodes()) {
                //    container.removeChild(container.lastChild);
                container.appendChild(document.createTextNode("Audience " + (number+1) + " tag(s):" ));
                var input = document.createElement("input");
                input.type = "text";
                input.id = "traits" + (number+1);
                container.appendChild(input);
                var select = document.createElement("select");
                select.id = "value" + (number+1);
                var option1 = document.createElement("option");
                option1.text = "On";
                option1.value = "True";
                select.appendChild(option1);
                var option2 = document.createElement("option");
                option2.text = "Off";
                option2.value = "False";
                select.appendChild(option2);
                container.appendChild(select);
                container.appendChild(document.createElement("br"));

                
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
                    if (confirm("Are you SURE you want to delete " + appname + "/" + featurename +"?") == true) {
                        const URL = 'http://localhost:3000/flags/' + appname + '/' + featurename ;
                    http.delete(URL)
                    .then(data => document.getElementById("flags").innerHTML =  "deleting [" + featurename + "]..." + ((data == null )? "" : JSON.stringify(data)))
                    .catch(err => document.getElementById("flags").innerHTML =  "Failed to delete [" + featurename + "]");
                }
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
                let rollouts = [];
                const no_of_rollouts = document.getElementById("rollouts").children.length/3;
                for ( i = 1; i <= no_of_rollouts; i++ ) {
                    traits_control_name="traits" + i;
                    let traits=document.getElementById(traits_control_name).value.split(",");
                    let value=(document.getElementById("value"+i).value === "True"); 
                    rollouts.push({traits,value})
                }
                const data = { rollout: [rollout, ...rollouts] }
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