const express = require('express');
const bodyParser = require('body-parser');
const soap = require('soap');

const app = express();
const port = process.env.SOAP_PORT || 8083;
const wsdlShippingFilePath = __dirname + '/wsdl/labs.wsdl';
// this endpoint requires credentials from polish post.
const wsdlTrackingFilePath = 'https://ws.poczta-polska.pl/Sledzenie/services/Sledzenie?wsdl';
// token for accessing this service endpoints
const token = process.env.SOAP_TOKEN;

app.use(bodyParser.json());

let clientShipping = null;
let clientTracking = null;

// error handler
app.use((err, req, res, next) => {
    res.status(err.statusCode).send(null);
});

/**
 * Request Example
 * {
 *     "method": "someSoapMethod",
 *     "params": {
 *         "attributes": {
 *             "attr1": "val",
 *             "attr2": "val
 *         },
 *         "param1: "val"
 *     },
 *     "login": "login to polish post",
 *     "pass": "password"
 * }
 */

// soap agent, json in, json out
app.post('/soap-agent', (req, res) => {
    if (!req.query.token || (req.query.token !== token)) {
        return res.status(403).send(null);
    }
    const json = req.body;

    if (json.method && json.params && json.login && json.pass) {
        clientShipping.setSecurity(new soap.BasicAuthSecurity(json.login, json.pass));
        const method = `${json.method}Async`;

        return clientShipping[method](json.params).then((result) => {
            res.json(result[0]);
        }).catch((err) => {
            console.log(err);
            res.status(400).json({ Error: `${err}` });
        });
    }

    res.status(400).json({ Error: 'Bad Request' });
});

const options = {
    hasNonce: true,
    mustUnderstand: true,
    hasTimeStamp: false,
    hasTokenCreated: true,
};

// soap agent, json in, json out
app.post('/tracking-agent', (req, res) => {
    if (!req.query.token || (req.query.token !== token)) {
        return res.status(403).send(null);
    }
    const json = req.body;

    if (json.method && json.params && json.login && json.pass) {
        clientTracking.setSecurity(new soap.WSSecurity(json.login, json.pass, options));
        const method = `${json.method}Async`;

        return clientTracking[method](json.params).then((result) => {
            res.json(result[0]);
        }).catch((err) => {
            console.log(err);
            res.status(400).json({ Error: `${err}` });
        });
    }

    res.status(400).json({ Error: 'Bad Request' });
});

// not supported route handling
app.all('/*', (_req, res) => {
    res.status(403).send(null);
});

// init Shipping client
soap.createClientAsync(wsdlShippingFilePath).then((soapClient) => {
    console.log('Soap Shipping Client created');
    clientShipping = soapClient;
}).catch((err) => {
    console.log('Soap Shipping Client initialization failed');
    console.log(err);
});

// init Tracking client
soap.createClientAsync(wsdlTrackingFilePath).then((soapClient) => {
    console.log('Soap Tracking Client created');
    clientTracking = soapClient;
}).catch((err) => {
    console.log('Soap Tracking Client initialization failed');
    console.log(err);
});

app.listen(port, () => console.log(`SoapService app listening on port: ${port}`));
