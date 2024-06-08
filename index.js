const express = require('express');
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 7860;


const semesterMapping = {
    1: 'First',
    2: 'Second',
    3: 'Third',
    4: 'Fourth',
    5: 'Fifth',
    6: 'Sixth',
    7: 'Seventh',
    8: 'Eighth',
    9: 'Ninth',
    10: 'Tenth'
};

app.get('/', async (req, res) => {
    return res.status(200).send({ 'status': 'running' })
})

app.get('/screenshot', async (req, res) => {
    const { rollno, sem } = req.query;

    if (!rollno || !sem) {
        return res.status(400).send('Missing rollno or sem parameter');
    }

    const semText = semesterMapping[parseInt(sem)];
    if (!semText) {
        return res.status(400).send('Invalid sem parameter');
    }
    try {
        const browser = await puppeteer.launch({ protocolTimeout: 5000 });
        const page = await browser.newPage();
        await page.setViewport({ width: 1080, height: 1024 });
        await page.goto('https://exam.pondiuni.edu.in/results/');

        await page.evaluate((rollno) => {
            document.querySelector("#reg_no").value = rollno;
        }, rollno);

        await page.evaluate(() => {
            document.querySelector("#exam").click();
        });

        await page.evaluate((semText) => {
            const options = document.querySelectorAll("#exam option");
            options.forEach(option => {
                if (option.textContent === semText) {
                    option.selected = true;
                }
            });
        }, semText);

        await page.evaluate(() => {
            document.querySelector("#print_app_form > span").click();
        });

        let screenshotPath = path.join(__dirname, `${rollno}.png`);
        try {
            await new Promise(resolve => setTimeout(resolve, 500));
            await page.screenshot({ path: screenshotPath });
            await page.close();
            await browser.close();
            res.sendFile(screenshotPath, err => {
                if (err) {
                    console.error('Failed to send file:', err);
                    return res.status(500).send('Failed to send file');
                }

                // Remove the screenshot file after sending it
                fs.unlink(screenshotPath, err => {
                    if (err) {
                        console.error('Failed to delete file:', err);
                    }
                });
            });
        } catch (error) {
            return res.status(400).send('reg no is incorrect or data is not found');
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send('An error occurred while processing your request');
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
