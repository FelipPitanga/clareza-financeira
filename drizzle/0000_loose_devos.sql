CREATE TABLE `accounts` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`scope` text NOT NULL,
	`initial` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`) REFERENCES `finance_users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `cards` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`account` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`,`account`) REFERENCES `accounts`(`owner`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `entries` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`account` text NOT NULL,
	`amount` integer NOT NULL,
	`date` text NOT NULL,
	`kind` text NOT NULL,
	`status` text NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`,`account`) REFERENCES `accounts`(`owner`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reserves` (
	`owner` text NOT NULL,
	`id` text NOT NULL,
	`account` text NOT NULL,
	`amount` integer NOT NULL,
	`payload` text NOT NULL,
	PRIMARY KEY(`owner`, `id`),
	FOREIGN KEY (`owner`,`account`) REFERENCES `accounts`(`owner`,`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `finance_users` (
	`id` text PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`categories` text DEFAULT '[]' NOT NULL
);
