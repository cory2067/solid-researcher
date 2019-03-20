const inquirer = require("inquirer");
const chalk = require("chalk");
const shell = require("shelljs");
const request = require("request-promise-native");
const seal = require('./sealjs');

const AGG_URI = "http://localhost:5000";

const promptWebId = () => {
  const questions = [
    { name: "webId", type: "input", message: "What is your WebID?" }
  ];

  return inquirer.prompt(questions);
};

const promptChoose = () => {
  const questions = [
    { name: "study", type: "input", message: "Which study do you want to aggregate?" }
  ];

  return inquirer.prompt(questions);
};

const keygen = async () => {
  console.log("Generating public/secret keys...");

  const context = new seal.SEALContext(2048, 128, 65536);

  // Generate a public/secret key pair
  const keygen = new seal.KeyGenerator(context);
  const pk = new seal.PublicKey(keygen);
  const sk = new seal.SecretKey(keygen);

  // These keys can be saved as a binary file
  pk.save('public.key');
  sk.save('secret.key');

  console.log(chalk.bold.green("Saved keys to this directory"));
};

const run = async () => {
  console.log(chalk.bold.blue("Solid Aggregation Service"));
  
  // if the "--keygen" flag was given, generate a key pair
  if (process.argv.includes('--keygen')) {
    return keygen();
  }

  // otherwise, aggregate
  console.log(chalk.gray("Fetching your studies..."));
  const webId = (await promptWebId()).webId;
  console.log(webId);
    
  const listReq = {
    uri: AGG_URI + "/api/studies",
    qs: {
      webid: webId
    },
    json: true
  };

  const studies = await request(listReq);
  if (!studies || !studies.length) {
    return console.log(chalk.bold.red("You have no studies open!"));
  }

  console.log("These are your current studies:");
  studies.forEach((s, i) => {
    console.log(chalk.cyan(chalk.bold(i) + "  " + s.summary));
  });

  const choice = parseInt((await promptChoose()).study);

  if (choice === NaN || choice < 0 || choice >= studies.length) {
    return console.log(chalk.bold.red("Invalid study index"));
  }

  const req = {
    uri: AGG_URI + "/api/aggregate", 
    qs: {
      study: studies[choice]._id
    }
  };
  const result = await request(req);
  console.log(result);
  
};

run();
