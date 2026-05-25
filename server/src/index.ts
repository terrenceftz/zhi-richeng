import app from './app';
import { config } from './config';
import { startFeishuClient } from './services/feishu.service';
import { startReminderService } from './services/reminder.service';
import { startDigestService } from './services/digest.service';

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
  startFeishuClient();
  startReminderService();
  startDigestService();
});
