const {
  visitPage,
  clickFirstLinkWithText,
  fillInFormInput,
  textIsDisplayedOnPage,
  assertInputValue
} = require('../support/actions');

const { Given, When, Then } = require('cucumber');

Given('I am not a registered user', function() {});

When('I go to the {string} page', visitPage);

When(
  'I click on first link {string} with class name {string}',
  clickFirstLinkWithText
);

When('I click on {string} button with class name {string}', clickFirstLinkWithText);

When('I fill in {string} with {string}', fillInFormInput);

Then('I see a message {string}', textIsDisplayedOnPage);

Then('I see my name {string}', name => assertInputValue('firstName', name));

Then('I see my email {string}', email => assertInputValue('email', email));

Then('I see student name {string}', textIsDisplayedOnPage);
