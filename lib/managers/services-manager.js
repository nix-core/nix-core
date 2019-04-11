const Rx = require('rx');

const ModuleService = require('../services/module-service');
const CommandService = require('../services/command-service');
const PermissionsService = require('../services/permissions-service');
const UserService = require('../services/user-service');
const { toObservable } = require("../utility");

class ServicesManager {
  constructor(chaos) {
    this._chaos = chaos;
    this._services = {};

    //Bind methods for aliasing to NixCore
    this.addService = this.addService.bind(this);
    this.getService = this.getService.bind(this);
  }

  get chaos() {
    return this._chaos;
  }

  get nix() {
    this.chaos.logger.warn('.nix is deprecated. Please use .chaos instead');
    return this.chaos;
  }

  get services() {
    return Object.values(this._services);
  }

  /**
   * Loads the core services provided by Nix
   */
  loadServices() {
    this.addService('core', ModuleService);
    this.addService('core', CommandService);
    this.addService('core', PermissionsService);
    this.addService('core', UserService);

    Object.entries(this.chaos.config.services).forEach(([moduleName, services]) => {
      services.forEach((service) => this.addService(moduleName, service));
    });
  }

  addService(moduleName, Service) {
    let serviceKey = `${moduleName}.${Service.name}`;

    if (this._services[serviceKey.toLowerCase()]) {
      let error = new Error(`The service '${serviceKey}' has already been added.`);
      error.name = "ServiceAlreadyExistsError";
      throw error;
    }

    let service = new Service(this.chaos);

    this.chaos.logger.verbose(`Loaded Service: ${serviceKey}`);
    this._services[serviceKey.toLowerCase()] = service;
  }

  getService(moduleName, serviceName) {
    let serviceKey = `${moduleName}.${serviceName}`;
    let service = this._services[serviceKey.toLowerCase()];

    if (!service) {
      let error = new Error(`The service '${serviceKey}' could not be found`);
      error.name = "ServiceNotFoundError";
      throw error;
    }

    return service;
  }

  configureServices() {
    return Rx.Observable.from(this.services)
      .do((service) => this.chaos.logger.debug(`Configure service: ${service.name}`))
      .filter((service) => service.configureService)
      .flatMap((service) => toObservable(service.configureService()))
      .defaultIfEmpty('')
      .last()
      .map(() => true);
  }

  onListen() {
    return Rx.Observable.from(this.services)
      .flatMap((service) => {
        if (service.onNixListen) {
          this.chaos.logger.warn('onNixListen is deprecated. Please use onListen');
          return toObservable(service.onNixListen());
        } else if (service.onListen) {
          return toObservable(service.onListen());
        } else {
          return Rx.Observable.empty();
        }
      })
      .toArray()
      .map(() => true);
  }

  onJoinGuild(guild) {
    return Rx.Observable.from(this.services)
      .flatMap((service) => {
        if (service.onNixJoinGuild) {
          this.chaos.logger.warn('onNixJoinGuild is deprecated. Please use onJoinGuild');
          return toObservable(service.onNixJoinGuild(guild));
        } else if (service.onJoinGuild) {
          return toObservable(service.onJoinGuild(guild));
        } else {
          return Rx.Observable.empty();
        }
      })
      .toArray()
      .map(() => true);
  }
}

module.exports = ServicesManager;