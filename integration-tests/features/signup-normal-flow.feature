Feature: Signup and enroll
  User can sign up and enroll

  Scenario: Successfully signup
    Given I am not a registered user
    When I go to the "home" page
    And I click on first link "Sign Up / Log In" with class name '.register'
    And I fill in "Enter your email" with "test1@create-learn.us"
    And I fill in "Create a password" with "insecure"
    And I fill in "Your name" with "John"
    And I fill in "Child Name" with "Joe"
    And I fill in "How did you hear about us" with "Newsletter"
    And I click on "Sign In" button with class name '.sign_in'
    Then I see a message "Explore Our Interactive Online Classes"
    When I click on "Learn more and enroll" button with class name '.learn_enroll'
    And I click on "Enroll" button with class name '.enroll_free'
    And I click on "Next" button with class name '.next_btn'
    Then I see a message "A Confirmation Message Just Arrived to Your Inbox"
