package com.wsi.annotation.api.ims;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;
import springfox.documentation.oas.annotations.EnableOpenApi;

@ComponentScan(value="com.wsi.annotation.api.**")
@EnableMongoRepositories(basePackages = {"com.wsi.annotation.api.database.dao"})
@SpringBootApplication(exclude = { DataSourceAutoConfiguration.class})
@EnableOpenApi
public class ManagerApplication {

	public static void main(String[] args) {
		SpringApplication.run(ManagerApplication.class, args);
	}

}
