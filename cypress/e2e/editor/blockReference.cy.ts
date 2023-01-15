import { createClient } from '@supabase/supabase-js';
import user from '../../fixtures/user.json';
import notes from '../../fixtures/notes.json';

const supabase = createClient(
  Cypress.env('NEXT_PUBLIC_SUPABASE_URL'),
  Cypress.env('NEXT_PUBLIC_SUPABASE_KEY')
);

describe('block reference', () => {
  beforeEach(() => {
    // seed the database and create a new note
    cy.exec('npm run db:seed')
      .then(() =>
        supabase.auth.signIn({
          email: user.email,
          password: user.password,
        })
      )
      .then(async (result) => {
        const data = notes.map((note) => ({
          ...note,
          user_id: result.user?.id,
        }));
        await supabase.from('notes').insert(data);
      });
  });

  it('can add a block reference by copying and pasting the block ref', () => {
    cy.visit(`/app/note/2c1f8ccd-42ad-4f94-ab7d-c36abb1328ca`);

    // Type some text into the editor, then click the 3 dots to the left
    cy.getEditor()
      .focus()
      .type('{movetostart}This is a test')
      .findByTestId('dropdown-button')
      .eq(0)
      .click();

    // Copy the block reference
    cy.findByText('Copy block reference').click();

    // Create a new block, then paste the block reference in it
    cy.window()
      .then((win) => win.navigator.clipboard.readText())
      .then((text) => {
        cy.getEditor().focus().type('{movetoend}{enter}').paste(text);
      });

    // Assert that there are now two blocks with the same content
    cy.findAllByText('This is a test').should('have.length', 2);

    // Wait for network requests
    cy.intercept({
      method: 'PATCH',
      url: /http:\/\/localhost:54321\/rest\/v1\/notes\?id=eq\..+/,
    }).as('patchRequest');
    cy.wait('@patchRequest');
    cy.wait('@patchRequest');

    // Assert that there is no error with the block reference
    cy.contains('Error: no block with id').should('have.length', 0);
  });

  it('can edit a block and have its references update', () => {
    cy.visit(`/app/note/c5e7a286-5ee7-40fa-bd36-5df278ba9575`);

    cy.getEditor()
      .focus()
      .type('{moveToStart}{downArrow}{rightArrow}{end} Hello');

    cy.getEditor()
      .findAllByText('This paragraph will be referenced. Hello')
      .should('have.length', 2);
  });
});