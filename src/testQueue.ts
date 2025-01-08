/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {CloudTasksClient} from '@google-cloud/tasks';

function currentTime() {
    console.log(Math.floor(Date.now()/1000));
}

function main() {
    console.log(JSON.stringify({data: {text: "Chicken parm recipe", image:""}}))
    const taskClient = new CloudTasksClient();
    taskClient.createTask({
        parent: "projects/lon-next/locations/us-central1/queues/queueA",
        task:{
            scheduleTime: {seconds: "1736458277"},
            httpRequest: {
                url: '',
                httpMethod: "POST",
                body: Buffer.from(JSON.stringify({data: {text: "Chicken parm recipe", image:""}})).toString("base64"),
                headers: {'Content-Type': 'application/json'},
            }
        },
        responseView: 'FULL',
    }).then((result) => {
        console.log(result[0].name);
    })
}

currentTime();
// main();