CREATE TABLE `bot_account` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
   `user_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'User id',
   `account_code` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'Account code',
   `source_type` char(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'source: address',
   `user_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'user name',
   `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal, 2 locked',
   `remarks` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
   `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
   `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='bot account';

CREATE TABLE `bot_chartgpt_base` (
     `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
     `type` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'type：twitter_food',
     `sequence` int(11) DEFAULT NULL COMMENT 'sort',
     `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
     `role` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'role',
     `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'content',
     `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
     `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
     `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
     PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='chatgpt base info';

CREATE TABLE `bot_chartgpt_record` (
   `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
   `uid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `comment_uid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `videos` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `images` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
   `request_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Request  content',
   `response_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT 'Reply content',
   `response_status` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
   `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
   `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
   `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
   PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='chatgpt调用记录';

CREATE TABLE `bot_post` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
    `uid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `author_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `user_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
    `videos` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `images` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '',
    `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
    `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='';

CREATE TABLE `bot_post_comment` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
    `reply_type` int(11) DEFAULT NULL COMMENT 'source：1 user, 2 bot',
    `uid` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `parent_user_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'parent User id',
    `parent_comment_uid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'parent rely id',
    `comment_uid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `author_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `user_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
    `videos` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `images` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '',
    `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
    `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='';

CREATE TABLE `bot_rel_user` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
    `user_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'User id',
    `account` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'account info',
    `rel_type` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'rel type: twitter',
    `rel_code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT ' rel Number',
    `rel_time` timestamp NULL DEFAULT NULL COMMENT '绑定时间',
    `rel_id` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'rel id',
    `rel_name` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'rel name',
    `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
    `remarks` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
    `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='bot rel user info';

CREATE TABLE `bot_twitter_record` (
      `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
      `uid` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `request_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `videos` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `images` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
      `request_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '',
      `response_content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '',
      `response_status` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
      `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
      `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
      `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
      PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='twitter调用记录';

CREATE TABLE `bot_user` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
    `author_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `user_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `status` int(11) DEFAULT NULL COMMENT 'status 0 invalid, 1 normal',
    `videos` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `images` varchar(5000) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT '',
    `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci COMMENT '',
    `remarks` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
    `create_time` timestamp NULL DEFAULT NULL COMMENT 'creation time',
    `deleted` tinyint(1) NOT NULL DEFAULT '0' COMMENT 'deletion mark',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='';

CREATE TABLE `scheduler_config` (
    `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Number',
    `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'task name',
    `service` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'service name',
    `method` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'method name',
    `cron` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL COMMENT 'cron，： 0 0 * * * ?',
    `status` int(11) NOT NULL COMMENT 'status 0 disable, 1 enable',
    `remarks` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL COMMENT 'remarks',
    `config` json DEFAULT NULL COMMENT 'config',
    `gmt_create` datetime NOT NULL COMMENT 'creation time',
    `gmt_modified` datetime NOT NULL COMMENT 'update time',
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC COMMENT='scheduler config';



