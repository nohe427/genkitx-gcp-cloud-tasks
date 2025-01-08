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