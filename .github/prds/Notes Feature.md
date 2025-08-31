Create a note taking feature

This is a single-user system and the notes are global in scope.
There is no audit requirement
There is no need to soft delete a note

A "note" should have the following properties:
- Date created
- Date modified
- Key Date (optional)
- Symbol (optional), one per Note
- Note Type
- Title
- Body

Database:
- Add tables as needed to support the functionality
- Use the .env file to determine database details (it's in Postgres)

UI:
- General:
    - Follow the UI standards in place. Mainly, use ShadCN components, TypeScript/React and Tailwind CSS.
    
- Menu
    - Add the notes feature to the global navigation
    
- CRUD for notes
    - Use markdown for the Body
    - Use a markdown editor for the Body
        - Pick a modern component that is compatible with Tailwind CSS
    - Warn the user if they enter a key date in the past
    - If the user deletes a note, confirm their decision first
    - Symbols should be in all caps.
        - Warn the user if the symbol has more than 5 characters
    - Note Type should be a drop-down with an optional fill-in
        - I can add a new note type if I want or pick from previously entered note types
        - If I add a new note type, it should be available for future notes in the drop-down.
        
- Grid
    - By default, shows all notes where Key Date is today's date or in the future
    - Sort by key date
    - Allow the user to sort by:
        - Symbol
        - Key Date
        - Note Type
    - Show the following columns:
        - Actions, Key Date, Symbol, Note Type, Title, First 60 characters of the Body. 
            - If the body is longer than 60 characters, show the full body as a tooltip
            - Use the exiting FinancialLinks component when rendering the Symbol
        - Show a toggle, "show expired notes"
        - Show a "filter by symbol"

        
