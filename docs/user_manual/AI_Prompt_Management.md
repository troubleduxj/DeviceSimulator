# AI Prompt Management Operation Manual

This manual guides you through the AI Prompt Management features in the IoT Digital Twin Simulator. This module allows you to customize the prompts used by the Generative AI (Gemini) to create simulation data, scenarios, and analysis reports.

## 1. Accessing the Interface

1.  Open the application.
2.  Navigate to **Settings** (Gear Icon) -> **Parameter Settings**.
3.  Click on the **"AI Prompts"** tab.

## 2. Interface Overview

The interface consists of two main areas:
*   **Sidebar (Left)**: Displays the list of available prompts.
    *   **Refresh Button**: Reloads the prompts from the server.
    *   **Reset All to Defaults**: Resets ALL prompts to their factory settings. **Use with caution.**
*   **Editor Area (Right)**:
    *   **Header**:
        *   **Editor / History Tabs**: Switch between editing mode and version history.
        *   **Reset Current**: Resets only the *currently selected* prompt to default.
        *   **Save**: Saves your changes.
    *   **Content**:
        *   **Key**: The system identifier for the prompt (read-only).
        *   **Description**: A brief description of what this prompt does.
        *   **Template Editor**: The main text area where you edit the prompt. Supports `{{variable}}` placeholders.

## 3. Editing a Prompt

1.  Select a prompt from the sidebar list (e.g., `simulation_batch`).
2.  Ensure you are in the **Editor** tab.
3.  Modify the **Description** or **Prompt Template** as needed.
    *   *Note*: Be careful not to remove essential placeholders (like `{{device_name}}`) unless you know what you are doing.
4.  Click **Save**.
    *   A new version will be created in the history.

## 4. Resetting a Single Prompt

If you have made mistakes and want to revert a specific prompt to its original state:
1.  Select the prompt.
2.  Click the **Reset Current** button (Orange icon) in the toolbar.
3.  Confirm the action.
    *   The prompt will be reset to the system default.
    *   This action is also recorded in history, so you can undo it via "Restore" if needed.

## 5. Version History & Restoration

Every time you save or reset a prompt, a version is saved.
1.  Select the prompt.
2.  Click the **History** tab in the editor header.
3.  You will see a timeline of changes.
    *   **Current**: The version currently in use.
    *   **Older Versions**: Previous states.
4.  To restore an older version:
    *   Locate the desired version in the list.
    *   Click the **Restore** button next to it.
    *   Confirm the action.
    *   The selected version becomes the current active version.

## 6. Resetting All Prompts

**Warning**: This action affects ALL prompts.
1.  In the sidebar (bottom), click **Reset All to Defaults**.
2.  Confirm the warning dialog.
3.  All prompts will be reverted to factory settings. All custom changes will be overwritten (though some might be recoverable via History if the history mechanism covers bulk resets, but relying on individual history is safer).

## 7. Troubleshooting

*   **"No prompts found"**: Check if the backend server is running. Click the Refresh button.
*   **Save Failed**: Check your network connection.
