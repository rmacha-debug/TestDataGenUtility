const express = require('express');
const exec  = require('child_process');
const path = require('path');
const bodyParser = require('body-parser');
const fs = require('fs');
const csv = require('csv-parser);

const app = express();
const PORT = 3000;

// Middleware to parse JSON
app.use(bodyParser.json());
app.use(express.static('public'));

// Define mapping of script names to .jmx file paths
const scriptMapping = {
    'GenerateTestData': {
        jmxPath: './apache-jmeter-5.6.3/Scripts/GenerateTestData.jmx',
    },
    'script2': {
        jmxPath: 'path_to_your_test_plans/script2.jmx',
    },
};

// Endpoint to run JMeter test
app.post('/run-test', (req, res) => {
    const { scriptname, env, tenant, tenantconfig, testtype } = req.body;

    const script = scriptMapping[scriptname];

    if (!script) {
        return res.status(400).send(`No JMX file found for script: ${scriptname}`);
    }

    const testPlanPath = script.jmxPath;

    const jmeterBatPath = path.join(__dirname, 'apache-jmeter-5.6.3', 'bin', 'jmeter.bat');

    // Generate a unique identifier for this test run
    const uniqueId = uuidv4();
    const resultsCsvPath = path.join(__dirname, `results_${uniqueId}.csv`);

    exec(`"${jmeterBatPath}" -n -t "${testPlanPath}" -Jenv="${env}" -Jtenant="${tenant}" -Jtenantconfig="${tenantconfig}" -Jtesttype="${testtype}" -Joutput="${resultsCsvPath}"`, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error: ${error.message}`);
            return res.status(500).send(`Error: ${error.message}`);
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
            return res.status(500).send(`stderr: ${stderr}`);
        }

        // Read the unique CSV output file and send as HTML table
        const results = [];

        fs.createReadStream(resultsCsvPath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', () => {
                // Generate HTML table from results
                let html = '<h2>Test Results</h2><table border="1"><tr>';
                // Add table headers
                Object.keys(results[0]).forEach(header => {
                    html += `<th>${header}</th>`;
                });
                html += '</tr>';
                // Add table rows
                results.forEach(row => {
                    html += '<tr>';
                    Object.values(row).forEach(value => {
                        html += `<td>${value}</td>`;
                    });
                    html += '</tr>';
                });
                html += '</table>';
                
                // Optionally delete the CSV file after use
                fs.unlinkSync(resultsCsvPath);
                
                res.send(html); // Send the HTML table
            });
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
