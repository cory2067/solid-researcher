const inquirer = require("inquirer");
const chalk = require("chalk");
const shell = require("shelljs");
const request = require("request-promise-native");
const seal = require('./sealjs');
const fs = require('fs');

const AGG_URI = "https://solid-aggregator.xyz";

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

// --keygen
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

// --submit FILE
const submit = async () => {
  const studyPath = process.argv[process.argv.length - 1];

  if (studyPath === '--submit') {
    return console.log(chalk.bold.red("Expected a file, aborting."));
  }
  
  console.log(chalk.gray("Reading file: " + studyPath));
  const study = JSON.parse(fs.readFileSync(studyPath));
  study.aggKey = AGG_URI + "/static/public.pem";
  
  const req = {
    method: "POST",
    uri: AGG_URI + "/api/study", 
    body: study,
    json: true,
  };

  try {
    await request(req);
    console.log(chalk.bold.green("Submitted study!"));
  } catch (e) {
    console.log(chalk.bold.red("Failed to submit study"));
  }
};

const decrypt = (path) => {
  const context = new seal.SEALContext(2048, 128, 65536);

  // Generate a public/secret key pair
  const keygen = new seal.KeyGenerator(context);
  const sk = new seal.SecretKey('secret.key');

  const ciphertext = new seal.Ciphertext(path);

  const decryptor = new seal.Decryptor(context, sk);
  const result = new seal.Plaintext(decryptor, ciphertext);

  const encoder = new seal.Encoder(65536);
  return encoder.decode(result);
};

const run = async () => {
  console.log(chalk.bold.blue("Solid Aggregation Service"));
  
  // if the "--keygen" flag was given, generate a key pair
  if (process.argv.includes('--keygen')) {
    return keygen();
  }
  
  // if the "--submit" flag was given, submit a study
  if (process.argv.includes('--submit')) {
    return submit();
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

  // Submit the aggregation request
  const aggReq = {
    uri: AGG_URI + "/api/aggregate", 
    qs: {
      study: studies[choice]._id
    },
    json: true
  };
  const aggRes = await request(aggReq);

  if (!aggRes.numerator) {
    console.log(chalk.red("Insufficient data to compute aggregate."));
    return;
  }
  
  console.log(chalk.green("Done! Now downloading/decrypting result"));

  // Download numerator value
  const numData = await request({
    uri: AGG_URI + aggRes.numerator, 
    encoding: null, // deal with weird binary data
  })
  fs.writeFileSync('numerator.seal', numData);

  const numPlain = decrypt('numerator.seal');
  
  let denPlain = 1;
  if (aggRes.denominator) {
    // Dpwnload denominator value
    const denData = await request({
      uri: AGG_URI + aggRes.denominator, 
      encoding: null,
    })
    fs.writeFileSync('denominator.seal', denData);
    denPlain = decrypt('denominator.seal');
  }

  console.log(chalk.green("Result: " + chalk.bold(numPlain/denPlain)));
};

run();
