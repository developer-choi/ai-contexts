# 안내
1. 여러 컴퓨터마다 동일한 내용이 ~/.gemini/GEMINI.md에 포함시키려고 작성했습니다.
2. 기존 ~/.gemini/GEMINI.md 에 있는 내용을 유지한상태로 아래 내용을 포함해주세요.

# **[IMPORTANT] Top Priority Work Rules**

## Reading Non-ASCII Files on Windows (Fix for Garbled Text)
When reading files with non-ASCII characters (e.g., Korean) located outside the allowed workspace on Windows, standard shell output often gets garbled. To read them correctly and efficiently:

1. **Copy** the target file to the current project's temporary directory.
   Command: `copy "<TARGET_FILE_PATH>" "<TEMP_DIR>\<FILENAME>"`
2. **Read** the copied file using the `read_file` tool.
3. **Delete** the copied file to clean up.

## **Check Project-Specific Rules (Mandatory)**
- Rules applicable to all projects are located in `~/WebstormProjects/ai-contexts/docs/for-all-projects`.
- Project-specific rules are defined in the `docs/contexts/` folder. (Some projects may not have this.)
- **Before starting work, you must read all files in the `docs/contexts/` folder and follow all instructions without exception.**
- Failure to follow these rules is considered a serious error.

## Language Preference
- **Always respond in Korean.** (Exception: Code, specific English terminology)
