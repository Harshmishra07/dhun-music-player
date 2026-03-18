# New Topics: Zombie Processes & Port Conflicts

During development, you may encounter situations where your server fails to start, or your website remains active even after you think you've closed the terminal. This is often caused by "Zombie Processes."

## What is a Zombie Process?
In the context of Node.js development, a "zombie" or "lingering" process is a background task that continues to run even after the terminal window or the parent process has been closed. 

These processes keep holding onto system resources, most importantly the **network ports** (like `3001` or `5173`).

## Symptoms
- **EADDRINUSE Error**: When running `npm start` or `npm run dev`, you see an error like `Error: listen EADDRINUSE: address already in use :::3001`.
- **Phantom Website**: Your browser still loads the latest version of your site even though no development servers appear to be running in your code editor.

## How to Resolve (Windows)

### 1. The "Kill All" Method (Fastest)
If you just want to clear every Node.js process and start fresh, run this in PowerShell:

```powershell
Get-Process -Name node | Stop-Process -Force
```

### 2. Manual Port Investigation
If you want to find exactly which process is using a specific port (e.g., 3001):

1. **Find the Process ID (PID)**:
   ```powershell
   netstat -ano | findstr :3001
   ```
   *The PID is the number at the far right of the output.*

2. **Kill the specific PID**:
   ```powershell
   taskkill /F /PID <Your_PID_Here>
   ```

## Best Practices
- Always use `Ctrl+C` to stop your server gracefully before closing your terminal or VS Code.
- If you switch branches or make major configuration changes, a quick `Get-Process -Name node | Stop-Process -Force` is a good way to ensure a clean state.
